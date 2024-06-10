const { Transform, Writable } = require('bare-stream')
const binding = require('./binding')
const constants = exports.constants = require('./lib/constants')
const errors = exports.errors = require('./lib/errors')

class ZlibStream extends Transform {
  constructor (mode, opts = {}) {
    super()

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

    this._handle = binding.init(this._mode, this._buffer, level, windowBits, memLevel, strategy, this,
      this._onalloc,
      this._onfree
    )
  }

  _onalloc (size) {
    const buffer = Buffer.allocUnsafe(size)

    const view = new Uint32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4)

    view[0] = this._allocations.push(view) - 1

    return buffer
  }

  _onfree (id) {
    const last = this._allocations.pop()

    if (last[0] !== id) {
      this._allocations[last[0] = id] = last
    }
  }

  async flush (mode = constants.Z_FULL_FLUSH, cb) {
    if (typeof mode === 'function') {
      cb = mode
      mode = constants.Z_FULL_FLUSH
    }

    const previousMode = this._flushMode

    this._flushMode = mode

    await Writable.drained(this)

    this._flushMode = previousMode

    if (cb) cb(null) // For Node.js compatibility
  }

  reset () {
    if (this._handle === null) {
      throw errors.STREAM_CLOSED('Stream has already closed')
    }

    binding.reset(this._handle)
  }

  _transform (data, encoding, cb) {
    binding.load(this._handle, data)

    let available
    do {
      try {
        available = binding.transform(this._handle, this._flushMode)
      } catch (err) {
        return cb(errors[err.code](err.message))
      }

      const read = this._buffer.length - available

      if (read) {
        const copy = Buffer.allocUnsafe(read)
        copy.set(this._buffer.subarray(0, read))

        this.push(copy)
      }
    } while (available === 0)

    cb(null)
  }

  _flush (cb) {
    let available
    try {
      available = binding.transform(this._handle, this._finishFlushMode)
    } catch (err) {
      return cb(errors[err.code](err.message))
    }

    const read = this._buffer.length - available

    if (read) this.push(this._buffer.subarray(0, read))

    try {
      binding.end(this._handle)
    } catch (err) {
      return cb(errors[err.code](err.message))
    }

    this._handle = null

    cb(null)
  }
}

exports.Deflate = class ZlibDeflateStream extends ZlibStream {
  constructor (opts) {
    super(binding.DEFLATE, opts)
  }
}

exports.createDeflate = function createDeflate (opts) {
  return new exports.Deflate(opts)
}

exports.Inflate = class ZlibInflateStream extends ZlibStream {
  constructor (opts) {
    super(binding.INFLATE, opts)
  }
}

exports.createInflate = function createInflate (opts) {
  return new exports.Inflate(opts)
}

exports.DeflateRaw = class ZlibDeflateRawStream extends ZlibStream {
  constructor (opts) {
    super(binding.DEFLATE_RAW, opts)
  }
}

exports.createDeflateRaw = function createDeflateRaw (opts) {
  return new exports.DeflateRaw(opts)
}

exports.InflateRaw = class ZlibInflateRawStream extends ZlibStream {
  constructor (opts) {
    super(binding.INFLATE_RAW, opts)
  }
}

exports.createInflateRaw = function createInflateRaw (opts) {
  return new exports.InflateRaw(opts)
}

exports.Gzip = class ZlibGzipStream extends ZlibStream {
  constructor (opts) {
    super(binding.GZIP, opts)
  }
}

exports.createGzip = function createGzip (opts) {
  return new exports.Gzip(opts)
}

exports.Gunzip = class ZlibGunzipStream extends ZlibStream {
  constructor (opts) {
    super(binding.GUNZIP, opts)
  }
}

exports.createGunzip = function createGunzip (opts) {
  return new exports.Gunzip(opts)
}
