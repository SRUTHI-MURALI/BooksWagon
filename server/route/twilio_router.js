require("dotenv").config();

const express = require("express");
const twilio_sms = require("../controller/twilio_sms");
const router = express.Router();

const isAuth = (req, res, next) => {
  if (req.session.isAuth) {
    next();
  } else {
    res.redirect("/login");
  }
};
const isLoggedin = (req, res, next) => {
  if (req.session.isLoggedin) {
    res.redirect("/home");
  } else {
    next();
  }
};

router.post("/sendOTP", twilio_sms.sendOTP);

router.post("/verifyOTP", twilio_sms.verifyOTP);
router.post("/send_password_OTP", twilio_sms.send_password_OTP);
router.post("/verify_password_OTP", twilio_sms.verify_password_OTP);

router.get("/sendOTP_signup", twilio_sms.sendOTPSignUp);
router.post("/verifyOTP_signUp", twilio_sms.verifyOTPSignUp);

module.exports = router;
