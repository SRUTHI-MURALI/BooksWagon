const { lock } = require("../route/twilio_router");
const controller = require("../controller/controller");
require("dotenv").config();
const usersSchema = require("../model/model");
const bcrypt = require("bcryptjs");
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);
const serviceSid = process.env.TWILIO_SERVICE_SID;

//send OTP
exports.sendOTP = async (req, res, next) => {
  const { phone } = req.body;
  const phonefind= await usersSchema.findOne({phone})
  if(phonefind){
    req.session.phone = phone;
    try {
      const otpResponse = await client.verify.v2
        .services(serviceSid)
        .verifications.create({
          to: "+91" + phone,
          channel: "sms",
        });
        res.json({
          success: true,
        
        });
    } catch (error) {
      res
        .status(error?.status || 400)
        .send(error?.message || "Something went wrong!");
    }
  }else{
    res.render("login_otp_page", { msg: "phone number is not existing" });
  }
 
};

//verify OTP
exports.verifyOTP = async (req, res) => {
  const verificationCode = req.body.otp;
  const phoneNumber = req.session.phone;

  if (!phoneNumber) {
    res.status(400).send({ message: "Phone number is required" });
    return;
  }

  try {
    // Verify the SMS code entered by the user
    const verification_check = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({
        to: "+91" + phoneNumber,
        code: verificationCode,
      });
    const user = await usersSchema.findOne({ phone: phoneNumber });
    const username = user.name;
    const userId = user._id;

    if (verification_check.status === "approved") {
      // If the verification is successful, do something

      req.session.isAuth = true;
      req.session.username = username;
      req.session.userId = userId;
      req.session.isLoggedin=true;
      res.redirect("/home");
    } else {
      // If the verification fails, return an error message
      res.render("login_otp_page", { message: "Invalid verification code" });
    }
  } catch (err) {
    res
      .status(500)
      .send({
        message: err.message || "Some error occurred while verifying the code",
      });
  }
};

exports.send_password_OTP = async (req, res, next) => {
  const { phone } = req.body;
  const phonefind= await usersSchema.findOne({phone:phone})
  
  
  if(phonefind){
  
 
  
    req.session.phone = phone;
  try {
    const otpResponse = await client.verify.v2
      .services(serviceSid)
      .verifications.create({
        to: "+91" + phone,
        channel: "sms",
      });
      res.json({
        success: true,
      
      });
  } catch (error) {
    res
      .status(error?.status || 400)
      .send(error?.message || "Something went wrong!");
  }
 
} else{
  res.render("login_otp_page", { msg: "phone number is not existing" });
}
  }
  


exports.verify_password_OTP = async (req, res) => {
  const verificationCode = req.body.otp;
  const phoneNumber = req.session.phone;
  const password = req.body.password;

  if (!phoneNumber) {
    res.status(400).send({ message: "Phone number is required" });
    return;
  }

  try {
    // Verify the SMS code entered by the user
    const verification_check = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({
        to: "+91" + phoneNumber,
        code: verificationCode,
      });

    if (verification_check.status === "approved") {
      // If the verification is successful, do something

      // res.render('home', { message: "Verification successful" });
      usersSchema.findOne({ phone: phoneNumber }).then((user) => {
        const saltRounds = 10; // You can adjust the number of salt rounds as needed
        bcrypt.hash(password, saltRounds, (err, hash) => {
          if (err) {
            res.status(500).send({
              message:
                err.message || "Some error occurred while hashing the password",
            });
          } else {
            usersSchema
              .findOneAndUpdate(
                { phone: phoneNumber },
                { password: hash },
                { useFindAndModify: false }
              )
              .then((data) => {
                if (!data) {
                  res
                    .status(404)
                    .send({
                      message: `Cannot update user with ID: ${phone}. User not found.`,
                    });
                } else {
                  res.render("login", {
                    message: "Successfully updated password",
                  });
                }
              })
              .catch((err) => {
                res
                  .status(500)
                  .send({ message: "Error updating user information" });
              });
          }
        });
      });
    } else {
      // If the verification fails, return an error message
      res.render("forget-password", { message: "Invalid verification code" });
    }
  } catch (err) {
    res
      .status(500)
      .send({
        message: err.message || "Some error occurred while verifying the code",
      });
  }
};


// sign up

exports.sendOTPSignUp = async (req, res, next) => {
  const  phone  = req.session.phone;
 
  if(phone){
    req.session.phone = phone;
    try {
      const otpResponse = await client.verify.v2
        .services(serviceSid)
        .verifications.create({
          to: "+91" + phone,
          channel: "sms",
        });
       res.render('signUp_Otp_verifyPage',{successMessage:'Otp Send Successfully' })
    } catch (error) {
      res
        .status(error?.status || 400)
        .send(error?.message || "Something went wrong!");
    }
  }
 
};

// verify signup
exports.verifyOTPSignUp = async (req, res) => {
  const verificationCode = req.body.otp;
 const phoneNumber=req.session.phone
  const user=req.session.user
  
  try {
    // Verify the SMS code entered by the user
    const verification_check = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({
        to: "+91" + phoneNumber,
        code: verificationCode,
      });
   const user_details=new usersSchema({
    ...user
   })
   await user_details.save()
    const username = user_details.name;
    const userId = user_details._id;

    if (verification_check.status === "approved") {
      // If the verification is successful, do something

      req.session.isAuth = true;
      req.session.username = username;
      req.session.userId = userId;
      req.session.isLoggedin=true;
      res.redirect("/home");
    } else {
      // If the verification fails, return an error message
      res.render("signUp_Otp_verifyPage", { message: "Invalid verification code" });
    }
  } catch (err) {
    res
      .status(500)
      .send({
        message: err.message || "Some error occurred while verifying the code",
      });
  }
};