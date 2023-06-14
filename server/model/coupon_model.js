const mongoose = require("mongoose");
var CouponSchema = new mongoose.Schema({
  coupon_code: {
    type:String,
    required: true,
  },
  expiry_date: {
    type:Date,
    required: true,
  },
  discount: {
    type:Number,
    required: true,
  },
  status: {
    type:String,
    required: true,
    default:"active"
  },
  
});

const Coupon = new mongoose.model("coupon", CouponSchema);

module.exports = Coupon;