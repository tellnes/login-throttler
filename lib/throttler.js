
var Attempt = require('./attempt').Attempt
  , debug = require('debug')('login-throttler:dispatcher')
  , MemoryStore = require('./stores/memory')

function defaultDelayFn(count) {
  if (!count) return 0
  return Math.min(Math.pow(2, count), 900)
}
exports.defaultDelayFn = defaultDelayFn

function Throttler(options) {
  this.configure(options)

  this.globalDelay = 0
  this.globalCaptcha = false

  this.stack = []
}

exports.Throttler = Throttler

Throttler.prototype.configure = function (options) {
  options = options || {}
  this.proxies = options.proxies
  this.store = options.store || new MemoryStore()
}

Throttler.prototype.use = function (fn) {
  debug('use %s', fn.name || 'anonymous')
  this.stack.push(fn)
}

Throttler.prototype.run = function (attempt, cb) {
  var index = 0
    , stack = this.stack

  ;(function next(err) {
    if (err) return cb(err)

    if (attempt.delay || attempt.captcha || attempt.pass)
      return cb(null, attempt)

    var layer = stack[index++]

    if (!layer) {
      attempt.pass = true
      next()
      return
    }

    debug('%s', layer.name || 'anonymous')
    layer(attempt, next)
  }())
}

Throttler.prototype.check = function (remoteAddr, account, cb) {
  if (typeof account === 'function') {
    cb = account
    account = null
  }

  var attempt = new Attempt(this, remoteAddr, account)
  this.run(attempt, cb)
}

Throttler.prototype.middleware = function (options) {
  options = options || {}
  var self = this
    , usernameField = options.usernameField || 'username'
    , assignProperty = options.assignProperty || 'attempt'
    , throttleHandler = options.throttleHandler

  return function (req, res, next) {
    var username = req.body && req.body[usernameField] || req.query && req.query[usernameField] || null
    self.check(req, username, function (err, attempt) {
      if (err) return next(err)

      req[assignProperty] = attempt

      if (attempt.captcha || attempt.delay) {
        if (throttleHandler) {
          return throttleHandler(req, res, next)
        }

        return next('route')
      }
      next()
    })
  }
}
