#include <assert.h>
#include <bare.h>
#include <js.h>
#include <limits.h>
#include <stddef.h>
#include <string.h>
#include <utf.h>
#include <utf/string.h>
#include <zlib.h>

#define Z_MIN_CHUNK     64
#define Z_MAX_CHUNK     INT32_MAX
#define Z_DEFAULT_CHUNK 1024 * 16

#define Z_MIN_MEMLEVEL     1
#define Z_MAX_MEMLEVEL     9
#define Z_DEFAULT_MEMLEVEL 8

#define Z_MIN_LEVEL     -1
#define Z_MAX_LEVEL     9
#define Z_DEFAULT_LEVEL Z_DEFAULT_COMPRESSION

#define Z_MIN_WINDOWBITS     8
#define Z_MAX_WINDOWBITS     15
#define Z_DEFAULT_WINDOWBITS 15

#define BARE_ZLIB_ERROR_CODES(V) \
  V(STREAM_ERROR) \
  V(DATA_ERROR) \
  V(MEM_ERROR) \
  V(BUF_ERROR) \
  V(VERSION_ERROR)

typedef struct {
  z_stream handle;

  int mode;

  uv_buf_t read;

  js_env_t *env;
  js_ref_t *ctx;
  js_ref_t *on_alloc;
  js_ref_t *on_free;
} bare_zlib_stream_t;

typedef struct {
  uint32_t id;
} bare_zlib_allocation_t;

enum {
  bare_zlib_deflate = 1,
  bare_zlib_inflate,
  bare_zlib_deflate_raw,
  bare_zlib_inflate_raw,
  bare_zlib_gzip,
  bare_zlib_gunzip,
};

static inline const char *
bare_zlib__error_code (int err) {
#define V(code) \
  if (err == Z_##code) return #code;
  BARE_ZLIB_ERROR_CODES(V)
#undef V

  return "UNKNOWN_ERROR";
}

static inline const char *
bare_zlib__error_message (int err, bare_zlib_stream_t *stream) {
  return stream->handle.msg == NULL ? "Unknown error" : stream->handle.msg;
}

static void *
bare_zlib__on_alloc (void *opaque, unsigned int items, unsigned int size) {
  int err;

  bare_zlib_stream_t *stream = (bare_zlib_stream_t *) opaque;

  js_env_t *env = stream->env;

  js_escapable_handle_scope_t *scope;
  err = js_open_escapable_handle_scope(env, &scope);
  assert(err == 0);

  js_value_t *ctx;
  err = js_get_reference_value(env, stream->ctx, &ctx);
  assert(err == 0);

  js_value_t *cb;
  err = js_get_reference_value(env, stream->on_alloc, &cb);
  assert(err == 0);

  js_value_t *args[1];

  err = js_create_uint32(env, sizeof(bare_zlib_allocation_t) + items * size, &args[0]);
  assert(err == 0);

  js_value_t *result;

  err = js_call_function(env, ctx, cb, 1, args, &result);
  assert(err == 0);

  err = js_escape_handle(env, scope, result, &result);
  assert(err == 0);

  bare_zlib_allocation_t *allocation;
  err = js_get_typedarray_info(env, result, NULL, (void *) &allocation, NULL, NULL, NULL);
  assert(err == 0);

  err = js_close_escapable_handle_scope(env, scope);
  assert(err == 0);

  return ((char *) allocation) + sizeof(bare_zlib_allocation_t);
}

static void
bare_zlib__on_free (void *opaque, void *ptr) {
  int err;

  bare_zlib_stream_t *stream = (bare_zlib_stream_t *) opaque;

  js_env_t *env = stream->env;

  js_handle_scope_t *scope;
  err = js_open_handle_scope(env, &scope);
  assert(err == 0);

  js_value_t *ctx;
  err = js_get_reference_value(env, stream->ctx, &ctx);
  assert(err == 0);

  js_value_t *cb;
  err = js_get_reference_value(env, stream->on_free, &cb);
  assert(err == 0);

  bare_zlib_allocation_t *allocation = (bare_zlib_allocation_t *) (((char *) ptr) - sizeof(bare_zlib_allocation_t));

  js_value_t *args[1];

  err = js_create_uint32(env, allocation->id, &args[0]);
  assert(err == 0);

  err = js_call_function(env, ctx, cb, 1, args, NULL);
  assert(err == 0);

  err = js_close_handle_scope(env, scope);
  assert(err == 0);
}

static js_value_t *
bare_zlib_init (js_env_t *env, js_callback_info_t *info) {
  int err;

  size_t argc = 9;
  js_value_t *argv[9];

  err = js_get_callback_info(env, info, &argc, argv, NULL, NULL);
  assert(err == 0);

  assert(argc == 9);

  js_value_t *handle;

  bare_zlib_stream_t *stream;
  err = js_create_arraybuffer(env, sizeof(bare_zlib_stream_t), (void **) &stream, &handle);
  assert(err == 0);

  stream->handle.zalloc = bare_zlib__on_alloc;
  stream->handle.zfree = bare_zlib__on_free;
  stream->handle.opaque = (void *) stream;

  err = js_get_value_int32(env, argv[0], &stream->mode);
  assert(err == 0);

  err = js_get_typedarray_info(env, argv[1], NULL, (void **) &stream->read.base, (size_t *) &stream->read.len, NULL, NULL);
  assert(err == 0);

  int level;
  err = js_get_value_int32(env, argv[2], &level);
  assert(err == 0);

  int window_bits;
  err = js_get_value_int32(env, argv[3], &window_bits);
  assert(err == 0);

  int mem_level;
  err = js_get_value_int32(env, argv[4], &mem_level);
  assert(err == 0);

  int strategy;
  err = js_get_value_int32(env, argv[5], &strategy);
  assert(err == 0);

  stream->env = env;

  err = js_create_reference(env, argv[6], 1, &stream->ctx);
  assert(err == 0);

  err = js_create_reference(env, argv[7], 1, &stream->on_alloc);
  assert(err == 0);

  err = js_create_reference(env, argv[8], 1, &stream->on_free);
  assert(err == 0);

  if (
    stream->mode == bare_zlib_gzip ||
    stream->mode == bare_zlib_gunzip
  ) {
    window_bits += 16; // Offset by 16 to enable gzip mode
  } else if (
    stream->mode == bare_zlib_deflate_raw ||
    stream->mode == bare_zlib_inflate_raw
  ) {
    window_bits *= -1; // Flip the sign to enable raw mode
  }

  switch (stream->mode) {
  case bare_zlib_deflate:
  case bare_zlib_deflate_raw:
  case bare_zlib_gzip:
    err = deflateInit2(&stream->handle, level, Z_DEFLATED, window_bits, mem_level, strategy);
    break;
  case bare_zlib_inflate:
  case bare_zlib_inflate_raw:
  case bare_zlib_gunzip:
    err = inflateInit2(&stream->handle, window_bits);
    break;
  default:
    return NULL;
  }

  assert(err == Z_OK);

  return handle;
}

static js_value_t *
bare_zlib_load (js_env_t *env, js_callback_info_t *info) {
  int err;

  size_t argc = 2;
  js_value_t *argv[2];

  err = js_get_callback_info(env, info, &argc, argv, NULL, NULL);
  assert(err == 0);

  assert(argc == 2);

  bare_zlib_stream_t *stream;
  err = js_get_arraybuffer_info(env, argv[0], (void **) &stream, NULL);
  assert(err == 0);

  err = js_get_typedarray_info(env, argv[1], NULL, (void **) &stream->handle.next_in, (size_t *) &stream->handle.avail_in, NULL, NULL);
  assert(err == 0);

  return NULL;
}

static js_value_t *
bare_zlib_transform (js_env_t *env, js_callback_info_t *info) {
  int err;

  size_t argc = 2;
  js_value_t *argv[2];

  err = js_get_callback_info(env, info, &argc, argv, NULL, NULL);
  assert(err == 0);

  assert(argc == 2);

  bare_zlib_stream_t *stream;
  err = js_get_arraybuffer_info(env, argv[0], (void **) &stream, NULL);
  assert(err == 0);

  uint32_t flush;
  err = js_get_value_uint32(env, argv[1], &flush);
  assert(err == 0);

  stream->handle.next_out = (unsigned char *) stream->read.base;
  stream->handle.avail_out = (unsigned int) stream->read.len;

  switch (stream->mode) {
  case bare_zlib_deflate:
  case bare_zlib_deflate_raw:
  case bare_zlib_gzip:
    err = deflate(&stream->handle, flush);
    break;
  case bare_zlib_inflate:
  case bare_zlib_inflate_raw:
  case bare_zlib_gunzip:
    err = inflate(&stream->handle, flush);
    break;
  }

  js_value_t *result = NULL;

  if (err < Z_OK) {
    js_throw_error(env, bare_zlib__error_code(err), bare_zlib__error_message(err, stream));
  } else {
    err = js_create_uint32(env, stream->handle.avail_out, &result);
    assert(err == 0);
  }

  return result;
}

static js_value_t *
bare_zlib_end (js_env_t *env, js_callback_info_t *info) {
  int err;

  size_t argc = 1;
  js_value_t *argv[1];

  err = js_get_callback_info(env, info, &argc, argv, NULL, NULL);
  assert(err == 0);

  assert(argc == 1);

  bare_zlib_stream_t *stream;
  err = js_get_arraybuffer_info(env, argv[0], (void **) &stream, NULL);
  assert(err == 0);

  switch (stream->mode) {
  case bare_zlib_deflate:
  case bare_zlib_deflate_raw:
  case bare_zlib_gzip:
    err = deflateEnd(&stream->handle);
    break;
  case bare_zlib_inflate:
  case bare_zlib_inflate_raw:
  case bare_zlib_gunzip:
    err = inflateEnd(&stream->handle);
    break;
  }

  if (err < Z_OK) {
    js_throw_error(env, bare_zlib__error_code(err), bare_zlib__error_message(err, stream));
  }

  err = js_delete_reference(env, stream->on_alloc);
  assert(err == 0);

  err = js_delete_reference(env, stream->on_free);
  assert(err == 0);

  err = js_delete_reference(env, stream->ctx);
  assert(err == 0);

  return NULL;
}

static js_value_t *
bare_zlib_reset (js_env_t *env, js_callback_info_t *info) {
  int err;

  size_t argc = 1;
  js_value_t *argv[1];

  err = js_get_callback_info(env, info, &argc, argv, NULL, NULL);
  assert(err == 0);

  assert(argc == 1);

  bare_zlib_stream_t *stream;
  err = js_get_arraybuffer_info(env, argv[0], (void **) &stream, NULL);
  assert(err == 0);

  switch (stream->mode) {
  case bare_zlib_deflate:
  case bare_zlib_deflate_raw:
  case bare_zlib_gzip:
    err = deflateReset(&stream->handle);
    break;
  case bare_zlib_inflate:
  case bare_zlib_inflate_raw:
  case bare_zlib_gunzip:
    err = inflateReset(&stream->handle);
    break;
  }

  if (err < Z_OK) {
    js_throw_error(env, bare_zlib__error_code(err), bare_zlib__error_message(err, stream));
  }

  return NULL;
}

static js_value_t *
bare_zlib_exports (js_env_t *env, js_value_t *exports) {
  int err;

#define V(name, fn) \
  { \
    js_value_t *val; \
    err = js_create_function(env, name, -1, fn, NULL, &val); \
    assert(err == 0); \
    err = js_set_named_property(env, exports, name, val); \
    assert(err == 0); \
  }

  V("init", bare_zlib_init)
  V("load", bare_zlib_load)
  V("transform", bare_zlib_transform)
  V("end", bare_zlib_end)
  V("reset", bare_zlib_reset)
#undef V

#define V(name, n) \
  { \
    js_value_t *val; \
    err = js_create_uint32(env, n, &val); \
    assert(err == 0); \
    err = js_set_named_property(env, exports, name, val); \
    assert(err == 0); \
  }

  V("DEFLATE", bare_zlib_deflate)
  V("INFLATE", bare_zlib_inflate)
  V("DEFLATE_RAW", bare_zlib_deflate_raw)
  V("INFLATE_RAW", bare_zlib_inflate_raw)
  V("GZIP", bare_zlib_gzip)
  V("GUNZIP", bare_zlib_gunzip)
#undef V

  js_value_t *constants;
  err = js_create_object(env, &constants);
  assert(err == 0);

  err = js_set_named_property(env, exports, "constants", constants);
  assert(err == 0);

#define V(name) \
  { \
    js_value_t *val; \
    err = js_create_int32(env, name, &val); \
    assert(err == 0); \
    err = js_set_named_property(env, constants, #name, val); \
    assert(err == 0); \
  }

  V(Z_NO_FLUSH)
  V(Z_PARTIAL_FLUSH)
  V(Z_SYNC_FLUSH)
  V(Z_FULL_FLUSH)
  V(Z_FINISH)
  V(Z_BLOCK)
  V(Z_TREES)

  V(Z_FILTERED)
  V(Z_HUFFMAN_ONLY)
  V(Z_RLE)
  V(Z_FIXED)
  V(Z_DEFAULT_STRATEGY)

  V(Z_NO_COMPRESSION)
  V(Z_BEST_SPEED)
  V(Z_BEST_COMPRESSION)
  V(Z_DEFAULT_COMPRESSION)

  V(Z_MIN_CHUNK)
  V(Z_MAX_CHUNK)
  V(Z_DEFAULT_CHUNK)

  V(Z_MIN_MEMLEVEL)
  V(Z_MAX_MEMLEVEL)
  V(Z_DEFAULT_MEMLEVEL)

  V(Z_MIN_LEVEL)
  V(Z_MAX_LEVEL)
  V(Z_DEFAULT_LEVEL)

  V(Z_MIN_WINDOWBITS)
  V(Z_MAX_WINDOWBITS)
  V(Z_DEFAULT_WINDOWBITS)

  V(Z_OK)
  V(Z_STREAM_END)
  V(Z_NEED_DICT)
  V(Z_ERRNO)
  V(Z_STREAM_ERROR)
  V(Z_DATA_ERROR)
  V(Z_MEM_ERROR)
  V(Z_BUF_ERROR)
  V(Z_VERSION_ERROR)
#undef V

  return exports;
}

BARE_MODULE(bare_zlib, bare_zlib_exports)
