module.exports = class ZlibError extends Error {
  constructor (msg, code, fn = ZlibError) {
    super(`${code}: ${msg}`)
    this.code = code

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, fn)
    }
  }

  get name () {
    return 'ZlibError'
  }

  static STREAM_CLOSED (msg) {
    return new ZlibError(msg, 'STREAM_CLOSED', ZlibError.STREAM_CLOSED)
  }

  static STREAM_ERROR (msg) {
    return new ZlibError(msg, 'STREAM_ERROR', ZlibError.STREAM_ERROR)
  }

  static DATA_ERROR (msg) {
    return new ZlibError(msg, 'DATA_ERROR', ZlibError.DATA_ERROR)
  }

  static MEM_ERROR (msg) {
    return new ZlibError(msg, 'MEM_ERROR', ZlibError.MEM_ERROR)
  }

  static BUF_ERROR (msg) {
    return new ZlibError(msg, 'BUF_ERROR', ZlibError.BUF_ERROR)
  }

  static VERSION_ERROR (msg) {
    return new ZlibError(msg, 'VERSION_ERROR', ZlibError.VERSION_ERROR)
  }

  static UNKNOWN_ERROR (msg) {
    return new ZlibError(msg, 'UNKNOWN_ERROR', ZlibError.UNKNOWN_ERROR)
  }
}
