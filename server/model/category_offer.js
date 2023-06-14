const mongoose = require("mongoose");
var OfferSchema = new mongoose.Schema({
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "category",
  },
  expiry_date: {
    type:Date,
    required: true,
  },
  amount: {
    type:Number,
    required: true,
  },
  status: {
    type:String,
    required: true,
    default:"active"
  },
  
});

const Offer = new mongoose.model("offer", OfferSchema);

module.exports = Offer;