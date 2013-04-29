var debugLib = require('debug')

module.exports = function failsTestGenerator(field) {
  var debug = debugLib('login-throttler:tests:' + field + '-fails')

  return function (options) {
    options = options || {}
    captchaBorder = options.captchaBorder || 60
    maxDelay = options.maxDelay || 60

    return function fails(attempt, cb) {
      attempt.throttler.store.failsForField(field, attempt[field], function (err, fails, latest) {
        if (err) return cb(err)

        if (!fails) {
          debug('0 fails for %s', field)
          return cb()
        }

        var delay = Math.pow(2, fails)
          , ago = Math.round((Date.now() / 1000) - latest)

        if (delay > captchaBorder) {
          attempt.captcha = true
        }
        if (delay > maxDelay) {
          delay = maxDelay
        }
        attempt.delay = Math.max(0, delay - ago)

        debug('%s fails for %s, latest %s seconds ago', fails, field, ago)
        cb()
      })
    }
  }
}
