var mysql
  , inherits = require('util').inherits
  , Store = require('../store')
  , debug = require('debug')('login-throttler:mysql-store')
  , net = require('net')

try {
  mysql = require('mysql')
} catch(err) {
  console.log('You need to install mysql package manually')
}

module.exports = MySQLStore

function MySQLStore(options) {
  Store.call(this)
  options = options || {}

  this.connection = options.connection || mysql.createConnection(options)

  if (options.createTable) this.createTable()
}
inherits(MySQLStore, Store)

MySQLStore.prototype._escapeIp = function (ip) {
  if (net.isIPv4(ip)) {
    ip = '::ffff:' + ip
  }

  if (!net.isIPv6(ip)) {
    return 'NULL'
  }

  return 'INET6_ATON(' + this.connection.escape(ip) + ')'
}

MySQLStore.prototype.createTable = function (cb) {
  var sql = 'CREATE TABLE IF NOT EXISTS `loginAttempts` ('
          + ' `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,'
          + ' `remoteAddr` BINARY(16),'
          + ' `attempted` TIMESTAMP,'
          + ' `success` BIT(1),'
          + ' `account` VARCHAR(255)'
          + ')'
  var self = this
  this.connection.query(sql, cb || function (err) {
    if (err) self.emit('error', err)
  })
}

MySQLStore.prototype.failsForField = function (field, value, cb) {
  var where = ' AND `' + field + '` = '
            + (field === 'remoteAddr' ? this._escapeIp(value) : this.connection.escape(value))

  var sql = 'SELECT'
          + ' COUNT(1) AS fails,'
          + ' UNIX_TIMESTAMP('
          + '   (SELECT MAX(`attempted`) FROM `loginAttempts` WHERE `success` = false ' + where + ')'
          + ' ) AS latest '
          + 'FROM `loginAttempts` '
          + 'WHERE '
          + ' `attempted` >= (SELECT if (MAX(`attempted`), MAX(`attempted`), 0) FROM `loginAttempts` WHERE `success` = true' + where + ') '
          + 'AND '
          + ' `success` = false'
          + where

  this.connection.query(sql, function (err, result) {
    if (err) return cb(err)
    var fails = result[0].fails
      , latest = result[0].latest
    debug('%s fails for %s, latest %s', fails, field, latest)
    cb(null, fails, latest)
  })
}

MySQLStore.prototype.failsGlobaly = function (period, cb) {
  var sql = 'SELECT COUNT(1) AS fails '
          + 'FROM `loginAttempts` '
          + 'WHERE '
          + ' `success` = false AND '
          + ' `attempted` > DATE_SUB(NOW(), INTERVAL ' + parseInt(period, 10) + ' SECOND)'

  this.connection.query(sql, function (err, result) {
    if (err) return cb(err)
    cb(null, result[0].fails)
  })
}

MySQLStore.prototype.knownRemoteAddr = function (remoteAddr, account, cb) {
  var conn = this.connection
  var sql = 'SELECT EXISTS('
          + ' SELECT 1 FROM `loginAttempts`'
          + ' WHERE'
          + '   `success` = true'
          + ' AND '
          + '   `remoteAddr` = ' + this._escapeIp(remoteAddr)
          +     (account ? ' AND account = ' + this.connection.escape(account) : '')
          + ' LIMIT 1'
          + ') AS `exists`'

  conn.query(sql, function (err, result) {
    if (err) return cb(err)
    cb(null, !!result[0].exists)
  })
}

MySQLStore.prototype.put = function (remoteAddr, account, success, cb) {
  var conn = this.connection
  var sql = 'INSERT INTO `loginAttempts` '
          + 'SET'
          + ' remoteAddr = ' + this._escapeIp(remoteAddr) + ','
          + ' account = ' + conn.escape(account) + ','
          + ' success = ' + (success ? '1' : '0')

  conn.query(sql, function (err) {
    if (err) return cb(err)
    cb(null)
  })
}
