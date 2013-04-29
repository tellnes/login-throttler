
module.exports = function () {
  return function knownRemoteAddr(attempt, cb) {
    attempt.throttler.store.knownRemoteAddr(attempt.remoteAddr, attempt.account, function (err, known) {
      if (err) return cb(err)
      if (known) {
        attempt.finish = true
      }
      cb()
    })
  }
}
