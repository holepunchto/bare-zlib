const test = require('brittle')
const fs = require('bare-fs')
const zlib = require('.')

test('deflate + inflate', (t) => {
  t.plan(1)

  const deflate = new zlib.Deflate()
  const inflate = new zlib.Inflate()

  deflate.pipe(inflate)

  inflate.on('data', (data) => t.alike(data, Buffer.from('hello')))

  deflate.end('hello')
})

test('deflare + inflate, callbacks', (t) => {
  t.plan(3)

  zlib.deflate('hello', (err, data) => {
    t.absent(err)

    zlib.inflate(data, (err, data) => {
      t.absent(err)
      t.alike(data, Buffer.from('hello'))
    })
  })
})

test('deflare + inflate, sync', (t) => {
  t.alike(zlib.inflateSync(zlib.deflateSync('hello')), Buffer.from('hello'))
})

test('deflate + inflate, flush', (t) => {
  t.plan(2)

  const deflate = new zlib.Deflate()
  const inflate = new zlib.Inflate()

  deflate.pipe(inflate)

  inflate.on('data', (data) => {
    t.alike(data, Buffer.from('hello'))

    deflate.end()
  })

  deflate.write('hello')

  deflate.flush(() => t.pass('flushed'))
})

test('inflate, write invalid', (t) => {
  t.plan(1)

  const inflate = new zlib.Inflate()

  inflate.on('error', (err) => t.is(err.code, 'DATA_ERROR')).end('foo bar')
})

test('gunzip', (t) => {
  t.plan(1)

  const gunzip = new zlib.Gunzip()

  fs.createReadStream('test/fixtures/hello.txt.gz').pipe(gunzip)

  gunzip.on('data', (data) => t.alike(data, Buffer.from('hello\n')))
})
