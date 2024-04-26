const { Transform } = require('bare-stream')
const binding = require('./binding')

const constants = exports.constants = binding.constants

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
      available = binding.transform(this._handle, this._flush)

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
    const available = binding.transform(this._handle, this._finishFlush)

    const read = this._buffer.length - available

    if (read) this.push(this._buffer.subarray(0, read))

    binding.end(this._handle)

    cb(null)
  }
}

exports.Deflate = class ZlibDeflateStream extends ZlibStream {
  constructor (opts) {
    super(binding.DEFLATE, opts)
  }
}

exports.Inflate = class ZlibInflateStream extends ZlibStream {
  constructor (opts) {
    super(binding.INFLATE, opts)
  }
}

function mapWritable (data) {
  return typeof data === 'string' ? Buffer.from(data) : data
}
