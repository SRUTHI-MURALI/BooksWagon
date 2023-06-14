const mongoose = require("mongoose");
var cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "project_sample",
    required: true,
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "product",
        required: true,
      },
      quantity: { type: Number, default: 1 },
       price: { type: Number, required: true },
    },
  ],
  total:{
    type:Number,
    default:0
  },
  walletAmt:{
    type:Number,
    default:0
  }
});

const User = new mongoose.model("cart", cartSchema);

module.exports = User;
