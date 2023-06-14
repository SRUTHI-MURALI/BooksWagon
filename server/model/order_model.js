const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "product",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
      price: {
        type: Number,
        required: true,
        min: 0,
      },
    },
  ],
  total: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    
    default: "Pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  payment_method: {
    type: String,
    required: false,
  },
  shipping_charge: {
    type: Number,
    required: true,
  },
  address: {
    type: Object,
    required: true,
   
  },
  isWallet:{
    type:String,
    default:'nil'

  },
  walletused:{
    type:Number,
    default:0
  },
  walletTotal:{
    type:Number,
    default:0
  }
});

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
