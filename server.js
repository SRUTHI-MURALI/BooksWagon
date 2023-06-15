const express = require('express')
const path = require('path')
const app = express()

require('dotenv').config()

const paypal = require("paypal-rest-sdk");

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

const nocache = require('nocache')

const session = require('express-session')

const admin_route = require('./server/route/admin_router')
const user_route = require('./server/route/user_router')
const twilio_route = require('./server/route/twilio_router')

require('./server/connection/connection')

app.use(nocache())

app.use(express.static('uploads'))

app.set('view engine', 'ejs')

const twilioRouter = require('./server/route/twilio_router')

app.use(express.urlencoded({ extended: true }))
app.use(express.json())

app.use(express.static(path.join(__dirname, 'public')))

app.use('/twilio-sms', twilioRouter)

app.use(
  session({
    secret: 'secret',
    resave: 'false',
    cookie: { sameSite: 'strict' },
    saveUninitialized: true
  })
)
paypal.configure({
  'mode':'sandbox',
  'client_id':PAYPAL_CLIENT_ID,
  'client_secret':PAYPAL_CLIENT_SECRET
  
})
app.set('views', [
  path.join(__dirname, 'views', 'admin-views'),
  path.join(__dirname, 'views', 'user_views'),
  path.join(__dirname, 'views', 'otp')
])
app.use((req, res, next) => {
  res.locals.message = req.session.message
  delete req.session.message
  next()
})
app.use(admin_route)
app.use(user_route)
app.use(twilio_route)

app.listen(3005)
