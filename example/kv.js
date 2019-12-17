var umkvps = require('../')
var kv = umkvps(require('memdb')())

var A = kv.session()
A.on('value', function (key, ids) {
  console.log(`A: ${key} => ${ids.join(',')}`)
})
A.open(['x','y'])

var B = kv.session()
B.on('value', function (key, ids) {
  console.log(`B: ${key} => ${ids.join(',')}`)
})
B.open(['x','z'])

var batches = [
  [
    { id: '00', key: 'x', links: [] },
    { id: '01', key: 'y', links: [] }
  ],
  [
    { id: '02', key: 'x', links: ['00'] },
    { id: '03', key: 'y', links: ['01'] },
    { id: '04', key: 'y', links: ['01'] }
  ],
  [
    { id: '05', key: 'y', links: ['03','04'] },
    { id: '06', key: 'z', links: [] }
  ]
]
;(function next (i) {
  if (i >= batches.length) return
  kv.batch(batches[i], function (err) {
    if (err) return console.error(err)
    console.log('---')
    next(i+1)
  })
})(0)
