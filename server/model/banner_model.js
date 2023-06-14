const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema({
  banner_image: [
    {
      type: String,
      required: true,
    },
  ],
  isDeleted: {
    type: Boolean,
    default: false,
  },
});

const Banner = mongoose.model("Banner", bannerSchema);

module.exports = Banner;
