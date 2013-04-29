var EventEmitter = require('events').EventEmitter
  , inherits = require('util').inherits
  , debug = require('debug')('login-throttler:tests:global-fails')

module.exports = function (options) {
  return function globalFails(attempt, next) {
    var throttler = attempt.throttler
    if (!throttler._globalFails) throttler._globalFails = new GlobalFails(throttler, options)
    throttler._globalFails.test(attempt, next)
  }
}

function GlobalFails(throttler, options) {
  this.throttler = throttler

  options = options || {}

  this.short = {}
  this.long = {}

  this.short.period = options.shortPeriod || 60 * 15
  this.long.period = options.longPeriod || 60 * 60 * 24 * 7

  this.short.timeout = options.shortTimeout || 30
  this.long.timeout = options.longTimeout || 60 * 60

  this.spacing = options.spacing = 3

  this.short.timestamp = 0
  this.long.timestamp = 0

  this.short.loading = false
  this.long.loading = false
}
inherits(GlobalFails, EventEmitter)
module.exports.GlobalFails = GlobalFails

GlobalFails.prototype.test = function (attempt, next) {
  var shortFails
    , longFails
    , self = this

  this.load('short', function (err, fails) {
    if (err) return then(err)
    shortFails = fails
    then()
  })

  this.load('long', function (err, fails) {
    if (err) return then(err)
    longFails = fails
    then()
  })

  var errState
    , miss = 2
  function then(err) {
    if (err) return next(errState = err)
    miss--
    if (miss) return


    // If count short period fails is x times bigger than long periode fails, then require captcha
    if (shortFails > (longFails * self.spacing)) {
      attempt.captcha = true
    }

    next()
  }
}

GlobalFails.prototype.load = function (key, cb) {
  var now = Date.now()
    , self = this

  if ((this[key].timestamp + this[key].timeout) > now) {
    cb(null, self[key].fails)
    return
  }

  this.once(key, cb)

  if (self[key].loading) return

  this.throttler.store.failsGlobaly(this[key].period, function (err, fails) {
    self[key].loading = false
    if (err) return self.emit(key, err)
    debug('%s fails %s', key, fails)
    self[key].fails = fails
    self.emit(key, null, fails)
  })
}
