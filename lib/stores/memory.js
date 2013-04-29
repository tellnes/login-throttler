
var debug = require('debug')('login-throttler:memory-store')
  , inherits = require('util').inherits
  , Store = require('../store')

var warning = 'WARNING: login-throttler MemoryStore is not\n'
            + 'designed for a production environment, as it will leak\n'
            + 'memory, and will not scale past a single process.'

// notify user that this store is not
// meant for a production environment
if ('production' == process.env.NODE_ENV) {
  console.warn(warning)
}

module.exports = MemoryStore

function MemoryStore() {
  Store.call(this)
  this.store = []
}
inherits(MemoryStore, Store)

MemoryStore.prototype.failsGlobaly = function (period, cb) {
  var count = 0
    , time = Date.now() - (period * 1000)

  this.store.forEach(function (row) {
    if (row.success == false && row.attempted > time) {
      count++
    }
  })

  debug('%s fails in last %s seconds globaly', count, period)

  process.nextTick(function () {
    cb(null, count)
  })
}

MemoryStore.prototype.failsForField = function (field, value, cb) {
  var count = 0
    , latest = null
    , i = this.store.length
    , row

  while(row = this.store[--i]) {
    if (row[field] == value) {
      if (row.success) break
      if (!latest) latest = row.attempted / 1000
      count++
    }
  }

  debug('%s fails for %s, latest %s', count, field, latest)

  process.nextTick(function () {
    cb(null, count, latest)
  })
}

MemoryStore.prototype.knownRemoteAddr = function (remoteAddr, account, cb) {

  var result = this.store.some(function (row) {
    if (row.success == true &&
        row.remoteAddr > remoteAddr &&
        (!account || row.account == account)
       ) {
      return true
    }
    return false
  })

  debug(remoteAddr.toString('hex') + ' is ' + (result ? '' : 'not') + ' know' + (account ? ' for ' + account : ''))

  process.nextTick(function () {
    cb(null, result)
  })
}


MemoryStore.prototype.put = function (remoteAddr, account, success, cb) {
  var obj = { remoteAddr: remoteAddr
            , account: account
            , success: success
            , attempted: Date.now()
            }
  debug('put ' + (success ? 'success' : 'fail'))
  this.store.push(obj)
  process.nextTick(cb)
}
