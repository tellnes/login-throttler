
var debug = require('debug')('login-throttler:tests:known-remote-addr')

module.exports = function () {
  return function knownRemoteAddr(attempt, cb) {
    attempt.throttler.store.knownRemoteAddr(attempt.remoteAddr, attempt.account, function (err, known) {
      if (err) return cb(err)
      debug('%s is %s for account %s', attempt.remoteAddr, (known ? 'known' : 'not known'), attempt.account)
      if (known) {
        attempt.pass = true
      }
      cb()
    })
  }
}
