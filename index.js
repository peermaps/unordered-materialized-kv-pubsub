var umkv = require('unordered-materialized-kv')
var { EventEmitter } = require('events')

module.exports = KV

function KV (db, opts) {
  var self = this
  if (!(self instanceof KV)) return new KV(db, opts)
  self._tick = 0 // prevent subscriptions from unfinished batch handlers
  self._subs = {}
  self._subLengths = {}
  self._sessions = {}
  self._lastSession = 0
  self._umkv = umkv(db, {
    onupdate: function (update) {
      var keys = Object.keys(update)
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i]
        if (!has(self._subs,key)) continue
        var ids = Object.keys(self._subs[key])
        for (var j = 0; j < ids.length; j++) {
          if (self._subs[key][ids[j]] === self._tick) continue
          self._sessions[ids[j]].emit('value', key, update[key])
        }
      }
    }
  })
}

KV.prototype.session = function (fn) {
  var session = new Session(this, this._lastSession++)
  if (typeof fn === 'function') session.on('value', fn)
  return session
}

KV.prototype.get = function (key, cb) {
  this._umkv.get(key, cb)
}

KV.prototype.batch = function (rows, cb) {
  var self = this
  self._umkv.batch(rows, function (err) {
    if (err) return cb(Err)
    self._tick++
    cb()
  })
}

KV.prototype.isLinked = function (key, cb) {
  this._umkv.isLinked(key, cb)
}

function Session (kv, id) {
  this._subs = {}
  this._kv = kv
  this._id = id
  kv._sessions[id] = this
}
Session.prototype = Object.create(EventEmitter.prototype)

Session.prototype.open = function (keys) {
  var self = this
  if (!Array.isArray(keys)) keys = [keys]
  keys.forEach(function (key) {
    self._subs[key] = true
    if (!has(self._kv._subs,key)) {
      self._kv._subs[key] = {}
      self._kv._subLengths[key] = 0
    }
    if (!has(self._kv._subs[key],self._id)) {
      self._kv._subs[key][self._id] = self._kv._tick
      self._kv._subLengths[key]++
    }
    self._kv.get(key, function (err, ids) {
      if (err && err.notFound) self.emit('value', key, [])
      else if (err) self.emit('error', err)
      else self.emit('value', key, ids)
    })
  })
}

Session.prototype.close = function (keys) {
  var self = this
  if (!Array.isArray(keys)) keys = [keys]
  keys.forEach(function (key) {
    delete self._subs[key]
    if (!has(self._kv._subs,key)) return
    if (!has(self._kv._subs[key],self._id)) return
    delete self._kv._subs[key][self._id]
    if (--self._kv._subLengths[key] === 0) {
      delete self._kv._subLengths[key]
      delete self._kv._subs[key]
    }
  })
}

Session.prototype.destroy = function () {
  this.close(Object.keys(this._subs))
  delete this._kv._sessions[this._id]
}

function has (obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key)
}
