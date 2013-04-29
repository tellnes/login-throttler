var inherits = require('util').inherits
  , EventEmitter = require('events').EventEmitter

module.exports = Store

function dutyOfSubclass() {
  throw new Error('this method must be implemented by subclass')
}

function Store() {
  EventEmitter.call(this)
}
inherits(Store, EventEmitter)

Store.prototype.failsGlobaly = dutyOfSubclass
Store.prototype.failsForField = dutyOfSubclass
Store.prototype.knownRemoteAddr = dutyOfSubclass
Store.prototype.put = dutyOfSubclass
