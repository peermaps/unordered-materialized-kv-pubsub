var test = require('tape')
var umkv = require('../')
var kv = umkv(require('memdb')())

test('open and close', function (t) {
  t.plan(6)
  var expected0 = {
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
  var expected1 = {
    A: [
      { key: 'a', ids: ['07'] }
    ],
    B: []
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
    t.deepEqual(actual, expected0)
    actual = { A: [], B: [] }
    A.close('b')
    B.destroy()
    kv.batch([
      { id: '07', key: 'a', links: ['02'] },
      { id: '08', key: 'b', links: ['05'] },
      { id: '09', key: 'c', links: [] }
    ], checkAgain)
  }
  function checkAgain (err) {
    t.ifError(err)
    process.nextTick(function () {
      t.deepEqual(actual, expected1)
    })
  }
})
