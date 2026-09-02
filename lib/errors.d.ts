type ZlibErrorCode =
  | 'STREAM_CLOSED'
  | 'STREAM_ERROR'
  | 'DATA_ERROR'
  | 'MEM_ERROR'
  | 'BUF_ERROR'
  | 'VERSION_ERROR'
  | 'UNKNOWN_ERROR'
  | 'LIMIT_EXCEEDED'

/**
 * An error thrown by a zlib operation, carrying a `code` identifying the underlying zlib failure
 * (such as `DATA_ERROR` or `MEM_ERROR`).
 */
declare class ZlibError extends Error {
  /** The zlib error code identifying the failure. */
  readonly code: ZlibErrorCode
  /** Always `'ZlibError'`. */
  readonly name: 'ZlibError'
}

export = ZlibError
