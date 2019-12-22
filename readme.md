# unordered-materialized-kv-pubsub

live-updating materialized view for pubsub sessions over
unordered key/id log messages

extends the [unordered-materialized-kv][] api with independent sessions that can
`open()` and `close()` sets of keys

The intended use with this module is the same as [unordered-materialized-kv][]
where another database is expected to store the actual documents for your
application and this module only manages linking in order to determine what the
"heads" or most recent versions, of the documents are.

see also: [unordered-materialized-kv-live][]

[unordered-materialized-kv]: https://github.com/digidem/unordered-materialized-kv
[unordered-materialized-kv-live]: https://github.com/peermaps/unordered-materialized-kv-live

# example

``` js
var umkvps = require('unordered-materialized-kv-pubsub')
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
```

output:

```
A: x => 
A: y => 
B: x => 
B: z => 
---
A: x => 00
B: x => 00
A: y => 01
---
A: x => 02
B: x => 02
A: y => 03,04
---
A: y => 05
B: z => 06
```

# api

``` js
var umkvps = require('unordered-materialized-kv-pubsub')
```

## var kv = umkvps(db)

Create a new `umkvps` instance `kv` from a leveldb instance `db`.

## var s = kv.session(fn)

Create a new pubsub session `s` with an optional value listener `fn`.

## s.on('value', fn)

Listen for changes to subscribed keys. This event also fires the first time a
key is subscribed to.

## s.open(keys)

Subscribe to an array of string `keys` or a single string key.

When you first subscribe to a key, the value is looked up with `kv.get()` and
the value is emitted in the `'value'` event. Then every time the key changes, a
`'value'` event will be emitted.

## s.close(keys)

Unsubscribe to an array of string `keys` or a single string key.

Stop receiving `'value'` events for a key or keys.

## s.destroy()

Unsubscribe to every subscribed key and detach the session from the `kv` so the
session may be garbage collected.

## var keys = s.getOpenKeys()

Return an array of the keys that are currently open, as strings.

## kv.get()

Lookup the array of ids that map to a given string `key` as `cb(err, ids)`.

These ids are the most recent versions or "heads" of the graph for that key.

## kv.batch(rows, cb)

Write an array of `rows` into the `kv`. Each `row` in the `rows` array has:

* `row.key` - string key to use
* `row.id` - unique id string of this record
* `row.links` - array of id string ancestor links

## kv.isLinked()

Test if a `key` is linked to as `cb(err, exists)` for a boolean `exists`.

# license

BSD
