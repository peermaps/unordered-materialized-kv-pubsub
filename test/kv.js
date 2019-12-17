var test = require('tape')
var umkv = require('../')
var kv = umkv(require('memdb')())

test('2 sessions', function (t) {
  t.plan(4)
  var expected = {
    A: [
      { key: 'a', ids: [] },
      { key: 'b', ids: [] },
      { key: 'a', ids: ['00'] },
      { key: 'b', ids: ['01'] },
      { key: 'a', ids: ['02'] },
      { key: 'b', ids: ['03','04'] },
      { key: 'b', ids: ['05'] }
    ],
    B: [
      { key: 'a', ids: [] },
      { key: 'c', ids: [] },
      { key: 'a', ids: ['00'] },
      { key: 'a', ids: ['02'] },
      { key: 'c', ids: ['06'] }
    ]
  }
  var actual = { A: [], B: [] }
  var A = kv.session(function (key, ids) {
    actual.A.push({ key, ids })
  })
  A.open(['a','b'])

  var B = kv.session()
  B.on('value', function (key, ids) {
    actual.B.push({ key, ids })
  })
  B.open(['a','c'])

  var batches = [
    [
      { id: '00', key: 'a', links: [] },
      { id: '01', key: 'b', links: [] }
    ],
    [
      { id: '02', key: 'a', links: ['00'] },
      { id: '03', key: 'b', links: ['01'] },
      { id: '04', key: 'b', links: ['01'] }
    ],
    [
      { id: '05', key: 'b', links: ['03','04'] },
      { id: '06', key: 'c', links: [] }
    ]
  ]
  ;(function next (i) {
    if (i >= batches.length) return process.nextTick(check)
    kv.batch(batches[i], function (err) {
      t.ifError(err)
      next(i+1)
    })
  })(0)
  function check () {
    t.deepEqual(actual, expected)
  }
})
