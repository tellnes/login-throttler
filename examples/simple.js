var throttler = require('../')
  , express = require('express')


var users = {
  'admin': { username: 'admin', password: 'admin', name: 'Admin' },
  'manager': { username: 'manager', password: 'manager', name: 'Manager' }
}

function checkDetails(username, password, done) {
  // Lookup user
  var user = users[username]

  if (!user) {
    return done(null, false)
  }

  if (user.password != password) {
    return done(null, false)
  }

  done(null, user)
}


function maybeHandleThrottling(attempt, res) {
  if (attempt.captcha && attempt.delay) {
    res.end('You must wait ' + attempt.delay + ' seconds before your next login attempt and then solve the captcha')
    return true
  }

  if (attempt.captcha) {
    res.end('Please solve the captcha')
    return true
  }

  if (attempt.delay) {
    res.end('You must wait ' + attempt.delay + ' seconds before your next login attempt')
    return true
  }

  return false
}

var app = express()

app.use(express.bodyParser())

app.get('/login', function (req, res, next) {
  throttler.check(req, function (err, attempt) {
    if (err) return next(err)

    if (maybeHandleThrottling(attempt, res)) return

    res.end('Please provide your credentials')
  })
})

app.post('/login', function (req, res, next) {
  var username = req.body.username

  throttler.check(req, username, function (err, attempt) {
    if (err) return next(err)

    if (maybeHandleThrottling(attempt, res)) return

    checkDetails(username, req.body.password, function (err, user) {
      if (err) return next(err)

      attempt.done(!!user, function (err) {
        if (err) return next(err)

        if (!user) {
          res.end('Wrong credentials')
        } else {
          res.end('Welcome ' + user.name)
        }
      })
    })
  })
})

app.listen(1337)
