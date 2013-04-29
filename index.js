
var Throttler = require('./lib/throttler').Throttler
  , Attempt = require('./lib/attempt').Attempt
  , fs = require('fs')
  , path = require('path')

exports = module.exports = new Throttler()
exports.Throttler = Throttler

exports.Attempt = Attempt


fs.readdirSync(path.join(__dirname, 'lib', 'stores')).forEach(function (filename){
  if (!/\.js$/.test(filename)) return
  var Store = require('./lib/stores/' + filename)
  exports[Store.name] = Store
})


var tests = exports.tests = {}
tests.globalFails = require('./lib/tests/global-fails')
tests.knownRemoteAddr = require('./lib/tests/known-remote-addr')
tests.accountFails = require('./lib/tests/fails')('account')
tests.remoteAddrFails = require('./lib/tests/fails')('remoteAddr')



exports.use(tests.knownRemoteAddr())
exports.use(tests.accountFails())
exports.use(tests.remoteAddrFails())
exports.use(tests.globalFails())
