import Buffer from 'bare-buffer'
import { Transform, TransformOptions, TransformEvents } from 'bare-stream'

import constants from './lib/constants'
import ZlibError from './lib/errors'

/** The input accepted by the one-shot functions: a string, `Buffer`, or `Uint8Array`. */
type ZlibInput = string | Buffer | Uint8Array

/**
 * Callback for the one-shot asynchronous functions, called with an error or the resulting `Buffer`.
 */
interface ZlibCallback {
  (err: Error | null, result: Buffer): void
}

/** Callback invoked once a `flush()` completes. */
interface ZlibFlushCallback {
  (err: Error | null): void
}

interface ZlibOptions<S extends ZlibStream = ZlibStream> extends Omit<
  TransformOptions<S>,
  'flush'
> {
  /** The flush mode used for each write, from `zlib.constants` (default `Z_NO_FLUSH`). */
  flush?: number
  /**
   * The flush mode used when the stream is finished, from `zlib.constants` (default `Z_FINISH`).
   */
  finishFlush?: number
  /** The size, in bytes, of the internal processing buffer (default `Z_DEFAULT_CHUNK`). */
  chunkSize?: number
  /**
   * The compression level, from `zlib.constants.Z_MIN_LEVEL` to `Z_MAX_LEVEL` (default
   * `Z_DEFAULT_LEVEL`).
   */
  level?: number
  /**
   * The base-2 logarithm of the window size, from `zlib.constants.Z_MIN_WINDOWBITS` to
   * `Z_MAX_WINDOWBITS` (default `Z_DEFAULT_WINDOWBITS`).
   */
  windowBits?: number
  /**
   * The amount of memory allocated for the internal compression state, from
   * `zlib.constants.Z_MIN_MEMLEVEL` to `Z_MAX_MEMLEVEL` (default `Z_DEFAULT_MEMLEVEL`).
   */
  memLevel?: number
  /** The compression strategy to use, from `zlib.constants` (default `Z_DEFAULT_STRATEGY`). */
  strategy?: number
  /**
   * The maximum number of output bytes allowed before the operation throws `LIMIT_EXCEEDED`
   * (defaults to `Buffer.constants.MAX_LENGTH`).
   */
  maxOutputLength?: number
}

/** The base `Transform` stream shared by all of the module's compressors and decompressors. */
interface ZlibStream<M extends TransformEvents = TransformEvents> extends Transform<M> {
  /**
   * Flush queued data through the stream immediately using the given flush `mode`, resolving once
   * it has drained.
   * @param mode - The flush mode, from `constants` (default `Z_FULL_FLUSH`).
   * @param cb - Called once the flush completes, for Node.js compatibility; the returned promise
   * resolves as well.
   */
  flush(mode?: number, cb?: ZlibFlushCallback): Promise<void>
  flush(cb: ZlibFlushCallback): Promise<void>

  /**
   * Reset the underlying compressor or decompressor to its initial state.
   * @throws {STREAM_CLOSED} the stream has already closed.
   */
  reset(): void
}

declare class ZlibStream<M extends TransformEvents = TransformEvents> extends Transform<M> {}

declare class Deflate extends ZlibStream {
  /**
   * Create a `Deflate` stream with the given `opts`.
   * @param opts - Options for the stream and the underlying zlib state.
   */
  constructor(opts?: ZlibOptions)
}

declare class Inflate extends ZlibStream {
  /**
   * Create an `Inflate` stream with the given `opts`.
   * @param opts - Options for the stream and the underlying zlib state.
   */
  constructor(opts?: ZlibOptions)
}

declare class DeflateRaw extends ZlibStream {
  /**
   * Create a `DeflateRaw` stream with the given `opts`.
   * @param opts - Options for the stream and the underlying zlib state.
   */
  constructor(opts?: ZlibOptions)
}

declare class InflateRaw extends ZlibStream {
  /**
   * Create an `InflateRaw` stream with the given `opts`.
   * @param opts - Options for the stream and the underlying zlib state.
   */
  constructor(opts?: ZlibOptions)
}

declare class Gzip extends ZlibStream {
  /**
   * Create a `Gzip` stream with the given `opts`.
   * @param opts - Options for the stream and the underlying zlib state.
   */
  constructor(opts?: ZlibOptions)
}

declare class Gunzip extends ZlibStream {
  /**
   * Create a `Gunzip` stream with the given `opts`.
   * @param opts - Options for the stream and the underlying zlib state.
   */
  constructor(opts?: ZlibOptions)
}

declare namespace Zlib {
  export {
    constants,
    ZlibError as errors,
    ZlibOptions,
    ZlibCallback,
    ZlibFlushCallback,
    ZlibInput,
    ZlibStream,
    Deflate,
    Inflate,
    DeflateRaw,
    InflateRaw,
    Gzip,
    Gunzip
  }

  /**
   * Create and return a new `Deflate` stream for streaming zlib compression.
   * @param opts - Options for the stream and the underlying zlib state.
   */
  export function createDeflate(opts?: ZlibOptions): Deflate
  /**
   * Create and return a new `Inflate` stream for streaming zlib decompression.
   * @param opts - Options for the stream and the underlying zlib state.
   */
  export function createInflate(opts?: ZlibOptions): Inflate
  /**
   * Create and return a new `DeflateRaw` stream for streaming raw deflate compression, without a
   * zlib header.
   * @param opts - Options for the stream and the underlying zlib state.
   */
  export function createDeflateRaw(opts?: ZlibOptions): DeflateRaw
  /**
   * Create and return a new `InflateRaw` stream for streaming raw deflate decompression, without a
   * zlib header.
   * @param opts - Options for the stream and the underlying zlib state.
   */
  export function createInflateRaw(opts?: ZlibOptions): InflateRaw
  /**
   * Create and return a new `Gzip` stream for streaming gzip compression.
   * @param opts - Options for the stream and the underlying zlib state.
   */
  export function createGzip(opts?: ZlibOptions): Gzip
  /**
   * Create and return a new `Gunzip` stream for streaming gzip decompression.
   * @param opts - Options for the stream and the underlying zlib state.
   */
  export function createGunzip(opts?: ZlibOptions): Gunzip

  /**
   * Compress `buffer` with deflate, calling `cb` with the resulting `Buffer`.
   * @param buffer - The data to compress.
   * @param opts - The zlib options to apply for this operation.
   * @param cb - Called with the resulting `Buffer`, or with an error if the operation fails.
   */
  export function deflate(buffer: ZlibInput, opts: ZlibOptions, cb: ZlibCallback): void
  export function deflate(buffer: ZlibInput, cb: ZlibCallback): void

  /**
   * Decompress `buffer` with inflate, calling `cb` with the resulting `Buffer`.
   * @param buffer - The data to decompress.
   * @param opts - The zlib options to apply for this operation.
   * @param cb - Called with the resulting `Buffer`, or with an error if the operation fails.
   */
  export function inflate(buffer: ZlibInput, opts: ZlibOptions, cb: ZlibCallback): void
  export function inflate(buffer: ZlibInput, cb: ZlibCallback): void

  /**
   * Compress `buffer` with raw deflate, without a zlib header, calling `cb` with the resulting
   * `Buffer`.
   * @param buffer - The data to compress.
   * @param opts - The zlib options to apply for this operation.
   * @param cb - Called with the resulting `Buffer`, or with an error if the operation fails.
   */
  export function deflateRaw(buffer: ZlibInput, opts: ZlibOptions, cb: ZlibCallback): void
  export function deflateRaw(buffer: ZlibInput, cb: ZlibCallback): void

  /**
   * Decompress `buffer` with raw inflate, without a zlib header, calling `cb` with the resulting
   * `Buffer`.
   * @param buffer - The data to decompress.
   * @param opts - The zlib options to apply for this operation.
   * @param cb - Called with the resulting `Buffer`, or with an error if the operation fails.
   */
  export function inflateRaw(buffer: ZlibInput, opts: ZlibOptions, cb: ZlibCallback): void
  export function inflateRaw(buffer: ZlibInput, cb: ZlibCallback): void

  /**
   * Compress `buffer` as gzip, calling `cb` with the resulting `Buffer`.
   * @param buffer - The data to compress.
   * @param opts - The zlib options to apply for this operation.
   * @param cb - Called with the resulting `Buffer`, or with an error if the operation fails.
   */
  export function gzip(buffer: ZlibInput, opts: ZlibOptions, cb: ZlibCallback): void
  export function gzip(buffer: ZlibInput, cb: ZlibCallback): void

  /**
   * Decompress `buffer` as gzip, calling `cb` with the resulting `Buffer`.
   * @param buffer - The data to decompress.
   * @param opts - The zlib options to apply for this operation.
   * @param cb - Called with the resulting `Buffer`, or with an error if the operation fails.
   */
  export function gunzip(buffer: ZlibInput, opts: ZlibOptions, cb: ZlibCallback): void
  export function gunzip(buffer: ZlibInput, cb: ZlibCallback): void

  /**
   * Synchronously compress `buffer` with deflate and return the resulting `Buffer`.
   * @param buffer - The data to compress; a string is converted to a `Buffer`.
   * @param opts - The zlib options to apply for this operation.
   * @throws {LIMIT_EXCEEDED} the output exceeded `maxOutputLength`.
   * @throws {ZlibError} the underlying zlib operation failed; `code` identifies the failure.
   */
  export function deflateSync(buffer: ZlibInput, opts?: ZlibOptions): Buffer
  /**
   * Synchronously decompress `buffer` with inflate and return the resulting `Buffer`.
   * @param buffer - The data to decompress; a string is converted to a `Buffer`.
   * @param opts - The zlib options to apply for this operation.
   * @throws {LIMIT_EXCEEDED} the output exceeded `maxOutputLength`.
   * @throws {ZlibError} the underlying zlib operation failed; `code` (such as `DATA_ERROR`)
   * identifies the failure.
   */
  export function inflateSync(buffer: ZlibInput, opts?: ZlibOptions): Buffer
  /**
   * Synchronously compress `buffer` with raw deflate, without a zlib header, and return the
   * resulting `Buffer`.
   * @param buffer - The data to compress; a string is converted to a `Buffer`.
   * @param opts - The zlib options to apply for this operation.
   * @throws {LIMIT_EXCEEDED} the output exceeded `maxOutputLength`.
   * @throws {ZlibError} the underlying zlib operation failed; `code` identifies the failure.
   */
  export function deflateRawSync(buffer: ZlibInput, opts?: ZlibOptions): Buffer
  /**
   * Synchronously decompress `buffer` with raw inflate, without a zlib header, and return the
   * resulting `Buffer`.
   * @param buffer - The data to decompress; a string is converted to a `Buffer`.
   * @param opts - The zlib options to apply for this operation.
   * @throws {LIMIT_EXCEEDED} the output exceeded `maxOutputLength`.
   * @throws {ZlibError} the underlying zlib operation failed; `code` (such as `DATA_ERROR`)
   * identifies the failure.
   */
  export function inflateRawSync(buffer: ZlibInput, opts?: ZlibOptions): Buffer
  /**
   * Synchronously compress `buffer` as gzip and return the resulting `Buffer`.
   * @param buffer - The data to compress; a string is converted to a `Buffer`.
   * @param opts - The zlib options to apply for this operation.
   * @throws {LIMIT_EXCEEDED} the output exceeded `maxOutputLength`.
   * @throws {ZlibError} the underlying zlib operation failed; `code` identifies the failure.
   */
  export function gzipSync(buffer: ZlibInput, opts?: ZlibOptions): Buffer
  /**
   * Synchronously decompress `buffer` as gzip and return the resulting `Buffer`.
   * @param buffer - The data to decompress; a string is converted to a `Buffer`.
   * @param opts - The zlib options to apply for this operation.
   * @throws {LIMIT_EXCEEDED} the output exceeded `maxOutputLength`.
   * @throws {ZlibError} the underlying zlib operation failed; `code` (such as `DATA_ERROR`)
   * identifies the failure.
   */
  export function gunzipSync(buffer: ZlibInput, opts?: ZlibOptions): Buffer
}

export = Zlib
