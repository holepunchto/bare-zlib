const test = require('brittle')
const zlib = require('.')

test('deflate + inflate', (t) => {
  t.plan(1)

  const deflate = new zlib.Deflate()
  const inflate = new zlib.Inflate()

  deflate.pipe(inflate)

  inflate.on('data', (data) => t.alike(data, Buffer.from('hello')))

  deflate.end('hello')
})

test('inflate, write invalid', (t) => {
  t.plan(1)

  const inflate = new zlib.Inflate()

  inflate
    .on('error', (err) => t.is(err.code, 'DATA_ERROR'))
    .end('foo bar')
})
