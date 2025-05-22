const { Transform, Writable } = require('bare-stream')
const binding = require('./binding')
const constants = require('./lib/constants')
const errors = require('./lib/errors')

exports.constants = constants
exports.errors = errors

class ZlibState {
  constructor(mode, opts = {}) {
    const {
      flush = constants.Z_NO_FLUSH,
      finishFlush = constants.Z_FINISH,
      chunkSize = constants.Z_DEFAULT_CHUNK,
      level = constants.Z_DEFAULT_LEVEL,
      windowBits = constants.Z_DEFAULT_WINDOWBITS,
      memLevel = constants.Z_DEFAULT_MEMLEVEL,
      strategy = constants.Z_DEFAULT_STRATEGY
    } = opts

    this._mode = mode

    this._flushMode = flush
    this._finishFlushMode = finishFlush
    this._allocations = []

    this._buffer = Buffer.allocUnsafe(chunkSize)

    this._handle = binding.init(
      this._mode,
      this._buffer,
      level,
      windowBits,
      memLevel,
      strategy,
      this,
      this._onalloc,
      this._onfree
    )
  }

  _onalloc(size) {
    const buffer = Buffer.allocUnsafe(size)

    const view = new Uint32Array(
      buffer.buffer,
      buffer.byteOffset,
      buffer.byteLength / 4
    )

    view[0] = this._allocations.push(view) - 1

    return buffer
  }

  _onfree(id) {
    const last = this._allocations.pop()

    if (last[0] !== id) {
      this._allocations[(last[0] = id)] = last
    }
  }

  reset() {
    binding.reset(this._handle)
  }

  *transform(data) {
    binding.load(this._handle, data)

    let available
    do {
      try {
        available = binding.transform(this._handle, this._flushMode)
      } catch (err) {
        throw errors[err.code](err.message)
      }

      const read = this._buffer.length - available

      if (read) {
        const copy = Buffer.allocUnsafe(read)
        copy.set(this._buffer.subarray(0, read))

        yield copy
      }
    } while (available === 0)
  }

  *flush() {
    let available
    try {
      available = binding.transform(this._handle, this._finishFlushMode)
    } catch (err) {
      throw errors[err.code](err.message)
    }

    const read = this._buffer.length - available

    if (read) yield this._buffer.subarray(0, read)

    try {
      binding.end(this._handle)
    } catch (err) {
      throw errors[err.code](err.message)
    }

    this._handle = null
  }
}

class ZlibStream extends Transform {
  constructor(mode, opts = {}) {
    super()

    this._state = new ZlibState(mode, opts)
  }

  async flush(mode = constants.Z_FULL_FLUSH, cb) {
    if (typeof mode === 'function') {
      cb = mode
      mode = constants.Z_FULL_FLUSH
    }

    const previousMode = this._state._flushMode

    this._state._flushMode = mode

    await Writable.drained(this)

    this._state._flushMode = previousMode

    if (cb) cb(null) // For Node.js compatibility
  }

  reset() {
    if (this._state === null) {
      throw errors.STREAM_CLOSED('Stream has already closed')
    }

    this._state.flush()
  }

  _transform(data, encoding, cb) {
    let err = null

    try {
      for (const chunk of this._state.transform(data)) {
        this.push(chunk)
      }
    } catch (e) {
      err = e
    }

    cb(err)
  }

  _flush(cb) {
    let err = null

    try {
      for (const chunk of this._state.flush()) {
        this.push(chunk)
      }
    } catch (e) {
      err = e
    }

    this._state = null

    cb(err)
  }
}

function readAsBuffer(stream, buffer, cb) {
  const chunks = []

  stream.on('data', ondata).on('end', onend).on('error', onerror).end(buffer)

  function ondata(chunk) {
    chunks.push(chunk)
  }

  function onend() {
    cb(null, chunks.length === 1 ? chunks[0] : Buffer.concat(chunks))
  }

  function onerror(err) {
    stream.off('end', onend)
    cb(err)
  }
}

function transformToBuffer(mode, buffer, opts) {
  if (typeof buffer === 'string') buffer = Buffer.from(buffer)

  const state = new ZlibState(mode, opts)
  const chunks = []

  for (const chunk of state.transform(buffer)) {
    chunks.push(chunk)
  }

  for (const chunk of state.flush()) {
    chunks.push(chunk)
  }

  return chunks.length === 1 ? chunks[0] : Buffer.concat(chunks)
}

exports.Deflate = class ZlibDeflateStream extends ZlibStream {
  constructor(opts) {
    super(binding.DEFLATE, opts)
  }
}

exports.createDeflate = function createDeflate(opts) {
  return new exports.Deflate(opts)
}

exports.deflate = function deflate(buffer, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }

  readAsBuffer(new exports.Deflate(opts), buffer, cb)
}

exports.deflateSync = function deflateSync(buffer, opts) {
  return transformToBuffer(binding.DEFLATE, buffer, opts)
}

exports.Inflate = class ZlibInflateStream extends ZlibStream {
  constructor(opts) {
    super(binding.INFLATE, opts)
  }
}

exports.createInflate = function createInflate(opts) {
  return new exports.Inflate(opts)
}

exports.inflate = function inflate(buffer, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }

  readAsBuffer(new exports.Inflate(opts), buffer, cb)
}

exports.inflateSync = function inflateSync(buffer, opts) {
  return transformToBuffer(binding.INFLATE, buffer, opts)
}

exports.DeflateRaw = class ZlibDeflateRawStream extends ZlibStream {
  constructor(opts) {
    super(binding.DEFLATE_RAW, opts)
  }
}

exports.createDeflateRaw = function createDeflateRaw(opts) {
  return new exports.DeflateRaw(opts)
}

exports.deflateRaw = function deflateRaw(buffer, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }

  readAsBuffer(new exports.DeflateRaw(opts), buffer, cb)
}

exports.deflateRawSync = function deflateRawSync(buffer, opts) {
  return transformToBuffer(binding.DEFLATE_RAW, buffer, opts)
}

exports.InflateRaw = class ZlibInflateRawStream extends ZlibStream {
  constructor(opts) {
    super(binding.INFLATE_RAW, opts)
  }
}

exports.createInflateRaw = function createInflateRaw(opts) {
  return new exports.InflateRaw(opts)
}

exports.inflateRaw = function inflateRaw(buffer, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }

  readAsBuffer(new exports.InflateRaw(opts), buffer, cb)
}

exports.inflateRawSync = function inflateRawSync(buffer, opts) {
  return transformToBuffer(binding.INFLATE_RAW, buffer, opts)
}

exports.Gzip = class ZlibGzipStream extends ZlibStream {
  constructor(opts) {
    super(binding.GZIP, opts)
  }
}

exports.createGzip = function createGzip(opts) {
  return new exports.Gzip(opts)
}

exports.gzip = function gzip(buffer, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }

  readAsBuffer(new exports.Gzip(opts), buffer, cb)
}

exports.gzipSync = function gzipSync(buffer, opts) {
  return transformToBuffer(binding.GZIP, buffer, opts)
}

exports.Gunzip = class ZlibGunzipStream extends ZlibStream {
  constructor(opts) {
    super(binding.GUNZIP, opts)
  }
}

exports.createGunzip = function createGunzip(opts) {
  return new exports.Gunzip(opts)
}

exports.gunzip = function gunzip(buffer, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }

  readAsBuffer(new exports.Gunzip(opts), buffer, cb)
}

exports.gunzipSync = function gunzipSync(buffer, opts) {
  return transformToBuffer(binding.GUNZIP, buffer, opts)
}
