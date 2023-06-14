const mongoose = require("mongoose");

var productSchema = new mongoose.Schema({
  name: {
    type: String,
    require: true,
  },
  price: {
    type: Number,
    require: true,
  },
  photo: [
    {
      type: String,

      required: true,
    },
  ],
  isDeleted: {
    type: Boolean,
    default: false,
  },
  category_name: {
    type: mongoose.Schema.Types.ObjectId,

    ref: "category",
  },
  description: {
    type: String,
    require: true,
  },
  stock: {
    type: Number,
    require: true,
  },
});

const Product = new mongoose.model("product", productSchema);

module.exports = Product;
