const { Transform, Writable } = require('bare-stream')
const binding = require('./binding')
const constants = exports.constants = require('./lib/constants')
const errors = exports.errors = require('./lib/errors')

const EMPTY = Buffer.alloc(0)

class ZlibStream extends Transform {
  constructor (mode, opts = {}) {
    super({ mapWritable })

    const {
      flush = constants.Z_NO_FLUSH,
      finishFlush = constants.Z_FINISH,
      chunkSize = 16 * 1024
    } = opts

    this._mode = mode

    this._flushMode = flush
    this._finishFlushMode = finishFlush

    this._buffer = Buffer.allocUnsafe(chunkSize)

    this._handle = binding.init(this._mode, this._buffer)
  }

  async flush (mode = constants.Z_FULL_FLUSH, cb) {
    if (typeof mode === 'function') {
      cb = mode
      mode = constants.Z_FULL_FLUSH
    }

    if (await Writable.drained(this)) {
      const previousMode = this._flushMode

      this._flushMode = mode

      this.write(EMPTY)

      await Writable.drained(this)

      this._flushMode = previousMode
    }

    if (cb) cb(null) // For Node.js compatibility
  }

  reset () {
    if (this._handle === null) {
      throw errors.STREAM_CLOSED('Stream has already closed')
    }

    binding.reset(this._handle)
  }

  _transform (data, cb) {
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

const Deflate = exports.Deflate = class ZlibDeflateStream extends ZlibStream {
  constructor (opts) {
    super(binding.DEFLATE, opts)
  }
}

exports.createDeflate = function createDeflate (opts) {
  return new Deflate(opts)
}

const Inflate = exports.Inflate = class ZlibInflateStream extends ZlibStream {
  constructor (opts) {
    super(binding.INFLATE, opts)
  }
}

exports.createInflate = function createInflate (opts) {
  return new Inflate(opts)
}

function mapWritable (data) {
  return typeof data === 'string' ? Buffer.from(data) : data
}
