
var throttler = require('../')
  , express = require('express')
  , passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy


var users = {
  'admin': { username: 'admin', password: 'admin', name: 'Admin' },
  'manager': { username: 'manager', password: 'manager', name: 'Manager' }
}

passport.use(new LocalStrategy(
  { passReqToCallback: true
  },
  function (req, username, password, done) {
    var user = users[username]
      , success = (user && user.password == password)

    req.attempt.done(success, function (err) {
      if (err) return done(err)

      if (!success) {
        return done(null, false, { message: 'Incorrect username and/or password.' })
      }

      done(null, user)
    })
  }
))

passport.serializeUser(function (user, done) {
  done(null, user.username)
})

passport.deserializeUser(function (username, done) {
  done(null, users[username])
})

function throttleHandler(req, res, next) {
  var attempt = req.attempt

  if (attempt.captcha && attempt.delay) {
    res.end('You must wait ' + attempt.delay + ' seconds before your next login attempt and then solve the captcha')
    return
  }

  if (attempt.captcha) {
    res.end('Please solve the captcha')
    return
  }

  if (attempt.delay) {
    res.end('You must wait ' + attempt.delay + ' seconds before your next login attempt')
    return
  }

  next()
}

var app = express()

app.use(express.cookieParser())
app.use(express.session({ secret: 'keyboard cat '}))
app.use(express.bodyParser())

app.use(passport.initialize())

app.get('/', function (req, res, next) {
  if (req.isAuthenticated()) {
    res.end('Welcome ' + req.user.name)
  } else {
    res.end('You are not logged in')
  }
})

app.get('/login'
  , throttler.middleware({ throttleHandler: throttleHandler })
  , function renderForm(req, res, next) {
      res.end('Please provide your credentials')
    }
)

app.post('/login'
  , throttler.middleware( { usernameField: 'username'
                          , throttleHandler: throttleHandler
                          }
                        )
  , passport.authenticate( 'local', { successRedirect: '/'
                                    , failureRedirect: '/login'
                                    }
                          )
)

app.listen(1337)
