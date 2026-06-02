import Buffer from 'bare-buffer'
import { Transform, TransformOptions, TransformEvents } from 'bare-stream'

import constants from './lib/constants'
import ZlibError from './lib/errors'

type ZlibInput = string | Buffer | Uint8Array

interface ZlibCallback {
  (err: Error | null, result: Buffer): void
}

interface ZlibFlushCallback {
  (err: Error | null): void
}

interface ZlibOptions<S extends ZlibStream = ZlibStream> extends Omit<
  TransformOptions<S>,
  'flush'
> {
  flush?: number
  finishFlush?: number
  chunkSize?: number
  level?: number
  windowBits?: number
  memLevel?: number
  strategy?: number
  maxOutputLength?: number
}

interface ZlibStream<M extends TransformEvents = TransformEvents> extends Transform<M> {
  flush(mode?: number, cb?: ZlibFlushCallback): Promise<void>
  flush(cb: ZlibFlushCallback): Promise<void>

  reset(): void
}

declare class ZlibStream<M extends TransformEvents = TransformEvents> extends Transform<M> {}

declare class Deflate extends ZlibStream {
  constructor(opts?: ZlibOptions)
}

declare class Inflate extends ZlibStream {
  constructor(opts?: ZlibOptions)
}

declare class DeflateRaw extends ZlibStream {
  constructor(opts?: ZlibOptions)
}

declare class InflateRaw extends ZlibStream {
  constructor(opts?: ZlibOptions)
}

declare class Gzip extends ZlibStream {
  constructor(opts?: ZlibOptions)
}

declare class Gunzip extends ZlibStream {
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

  export function createDeflate(opts?: ZlibOptions): Deflate
  export function createInflate(opts?: ZlibOptions): Inflate
  export function createDeflateRaw(opts?: ZlibOptions): DeflateRaw
  export function createInflateRaw(opts?: ZlibOptions): InflateRaw
  export function createGzip(opts?: ZlibOptions): Gzip
  export function createGunzip(opts?: ZlibOptions): Gunzip

  export function deflate(buffer: ZlibInput, opts: ZlibOptions, cb: ZlibCallback): void
  export function deflate(buffer: ZlibInput, cb: ZlibCallback): void

  export function inflate(buffer: ZlibInput, opts: ZlibOptions, cb: ZlibCallback): void
  export function inflate(buffer: ZlibInput, cb: ZlibCallback): void

  export function deflateRaw(buffer: ZlibInput, opts: ZlibOptions, cb: ZlibCallback): void
  export function deflateRaw(buffer: ZlibInput, cb: ZlibCallback): void

  export function inflateRaw(buffer: ZlibInput, opts: ZlibOptions, cb: ZlibCallback): void
  export function inflateRaw(buffer: ZlibInput, cb: ZlibCallback): void

  export function gzip(buffer: ZlibInput, opts: ZlibOptions, cb: ZlibCallback): void
  export function gzip(buffer: ZlibInput, cb: ZlibCallback): void

  export function gunzip(buffer: ZlibInput, opts: ZlibOptions, cb: ZlibCallback): void
  export function gunzip(buffer: ZlibInput, cb: ZlibCallback): void

  export function deflateSync(buffer: ZlibInput, opts?: ZlibOptions): Buffer
  export function inflateSync(buffer: ZlibInput, opts?: ZlibOptions): Buffer
  export function deflateRawSync(buffer: ZlibInput, opts?: ZlibOptions): Buffer
  export function inflateRawSync(buffer: ZlibInput, opts?: ZlibOptions): Buffer
  export function gzipSync(buffer: ZlibInput, opts?: ZlibOptions): Buffer
  export function gunzipSync(buffer: ZlibInput, opts?: ZlibOptions): Buffer
}

export = Zlib
