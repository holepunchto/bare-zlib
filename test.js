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
