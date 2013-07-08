var inherits = require('util').inherits
  , Store = require('../store')
  , EventEmitter = require('events').EventEmitter
  , debug = require('debug')('login-throttler:mongodb-store')

module.exports = MongoDBStore

function MongoDBStore(options) {
  Store.call(this)
  options = options || {}

  if (!options.collection)
    throw new Error('The `collection` option is required')

  this.collection = options.collection
}
inherits(MongoDBStore, Store)

MongoDBStore.prototype._getCollection = function (cb) {
  cb(null, this.collection)
}

MongoDBStore.prototype.failsForField = function (field, value, cb) {
  this._getCollection(function (err, coll) {
    if (err) return cb(err)

    var sel = { _id: field + '-' + value
              }

    coll.findOne(sel, ['fails'], function (err, row) {
      if (err) return cb(err)
      if (!row || !row.fails) return cb(null, 0, null)
      cb(null, row.fails.count, row.fails.latest)
    })
  })
}

MongoDBStore.prototype.failsGlobaly = function (period, cb) {
  this._getCollection(function (err, coll) {
    var from = new Date(Date.now() - (parseInt(period, 10) * 1000))
      , sel = { type: 'ip'
              , attempts: { $elemMatch: { success: false
                                        , when: { $gte: from }
                                        } }
              }

    coll.count(sel, function (err, count) {
      cb(err, count)
    })
  })
}

MongoDBStore.prototype.knownRemoteAddr = function (remoteAddr, account, cb) {
  this._getCollection(function (err, coll) {
    if (err) return cb(err)

    var sel
    if (account) {
      sel = { _id: 'account-' + account
            , attempts: { $elemMatch: { ip: remoteAddr, success: true } }
            }

    } else {
      sel = { _id: 'ip-' + remoteAddr
            , attempts: { $elemMatch: { success: true } }
            }
    }

    coll.findOne(sel, ['_id'], function (err, row) {
      if (err) return cb(err)
      cb(null, !!row)
    })
  })
}

MongoDBStore.prototype.put = function (remoteAddr, account, success, cb) {
  debug('put; ip: %s, account: %s, success: %s', remoteAddr, account, success)
  var attempts = { attempts: { success: success, when: new Date() } }

  var updIp = { _id: 'ip-' + remoteAddr
              , type: 'ip'
              , $push: { attempts: { success: success, when: new Date() } }
              }

  if (success) {
    updIp.fails = { latest: null
                  , count: 0
                  }
  } else {

  }

  if (account) {
    updIp.$push.accounts = account

    var updAc = { _id: 'account-' + remoteAddr
                , type: 'account'
                , $push:  { attempts: { success: success
                                      , when: new Date()
                                      , ip: remoteAddr
                                      }
                          }
                }
  }

  update(updIp)

  if (account)
    update(updAc)


  var self = this
    , hadErr

  function update(update) {
    if (success) {
      update.fails =  { latest: null
                      , count: 0
                      }
    } else {
      update.fails =  { latest: new Date()
                      , $inc: { count: 1 }
                      }
    }

    self._getCollection(function (err, coll) {
      if (err) return cb(err)
      coll.update({ _id: update._id }, update, { upsert: true }, onRes)
    })

  }

  function onRes(err) {
    if (hadErr) return
    if (err) return cb(hadErr = err)
    cb(null)
  }
}
