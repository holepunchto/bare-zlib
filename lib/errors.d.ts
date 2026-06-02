type ZlibErrorCode =
  | 'STREAM_CLOSED'
  | 'STREAM_ERROR'
  | 'DATA_ERROR'
  | 'MEM_ERROR'
  | 'BUF_ERROR'
  | 'VERSION_ERROR'
  | 'UNKNOWN_ERROR'
  | 'LIMIT_EXCEEDED'

declare class ZlibError extends Error {
  readonly code: ZlibErrorCode
  readonly name: 'ZlibError'
}

export = ZlibError
