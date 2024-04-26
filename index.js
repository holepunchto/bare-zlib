const { Transform } = require('bare-stream')
const binding = require('./binding')
const constants = exports.constants = require('./lib/constants')
const errors = exports.errors = require('./lib/errors')

class ZlibStream extends Transform {
  constructor (mode, opts = {}) {
    super({ mapWritable })

    const {
      flush = constants.Z_NO_FLUSH,
      finishFlush = constants.Z_FINISH,
      chunkSize = 16 * 1024
    } = opts

    this._mode = mode

    this._flush = flush
    this._finishFlush = finishFlush

    this._buffer = Buffer.allocUnsafe(chunkSize)

    this._handle = binding.init(this._mode, this._buffer)
  }

  _transform (data, cb) {
    binding.chunk(this._handle, data)

    let available
    do {
      try {
        available = binding.transform(this._handle, this._flush)
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

  _final (cb) {
    let available
    try {
      available = binding.transform(this._handle, this._finishFlush)
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
