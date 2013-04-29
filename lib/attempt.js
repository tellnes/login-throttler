
var addr = require('addr')
  , debug = require('debug')('login-throttler:attempt')

function Attempt(throttler, remoteAddr, account) {
  this.throttler = throttler

  // request object (http.IncomingMessage)
  if (typeof remoteAddr === 'object') remoteAddr = addr(remoteAddr, throttler.proxies)
  this.remoteAddr = remoteAddr

  this.account = account

  this.pass = false
  this.delay = 0
  this.captcha = false

  debug('remoteAddr: %s, account: %s', remoteAddr, this.account)
}

exports.Attempt = Attempt

Attempt.prototype.done = function (success, cb) {
  this.throttler.store.put(this.remoteAddr, this.account, success, cb)
}
