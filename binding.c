#include <assert.h>
#include <bare.h>
#include <js.h>
#include <stddef.h>
#include <stdlib.h>
#include <string.h>
#include <utf.h>
#include <utf/string.h>
#include <zlib.h>

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
} bare_zlib_stream_t;

enum {
  bare_zlib_deflate = 1,
  bare_zlib_inflate,
};

static inline const char *
bare_zlib__error_code (int err) {
#define V(code) \
  if (err == Z_##code) return #code;
  BARE_ZLIB_ERROR_CODES(V)
#undef V

  return "UNKNOWN_ERROR";
}

static void *
bare_zlib__on_alloc (void *opaque, unsigned int items, unsigned int size) {
  bare_zlib_stream_t *stream = (bare_zlib_stream_t *) opaque;

  return calloc(items, size);
}

static void
bare_zlib__on_free (void *opaque, void *address) {
  bare_zlib_stream_t *stream = (bare_zlib_stream_t *) opaque;

  free(address);
}

static js_value_t *
bare_zlib_init (js_env_t *env, js_callback_info_t *info) {
  int err;

  size_t argc = 2;
  js_value_t *argv[2];

  err = js_get_callback_info(env, info, &argc, argv, NULL, NULL);
  assert(err == 0);

  assert(argc == 2);

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

  switch (stream->mode) {
  case bare_zlib_deflate:
    err = deflateInit(&stream->handle, Z_DEFAULT_COMPRESSION);
    break;
  case bare_zlib_inflate:
    err = inflateInit(&stream->handle);
    break;
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
    err = deflate(&stream->handle, flush);
    break;
  case bare_zlib_inflate:
    err = inflate(&stream->handle, flush);
    break;
  }

  js_value_t *result = NULL;

  if (err < Z_OK) {
    js_throw_error(env, bare_zlib__error_code(err), stream->handle.msg);
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
    err = deflateEnd(&stream->handle);
    break;
  case bare_zlib_inflate:
    err = inflateEnd(&stream->handle);
    break;
  }

  if (err < Z_OK) {
    js_throw_error(env, bare_zlib__error_code(err), stream->handle.msg);
  }

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
    err = deflateReset(&stream->handle);
    break;
  case bare_zlib_inflate:
    err = inflateReset(&stream->handle);
    break;
  }

  if (err < Z_OK) {
    js_throw_error(env, bare_zlib__error_code(err), stream->handle.msg);
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
