const mongoose = require("mongoose");

var usersSchema = new mongoose.Schema({
  name: {
    type: String,
    require: true,
  },
  email: {
    type: String,
    require: true,
  },
  phone: {  
    type: Number,
    require: true,
  },
  photo: 
   [{
      type: String,

      required: true,
    }],
    gender: {
      type: String,
     
    },
   
  account_no: {
      type: Number,
      
      
    }, 
  password: {
    type: String,
    require: true,
  },

  isBlocked: {
    default: false,
    type: Boolean,
  },
  wallet: [{
    order_id:{
      type: mongoose.Schema.Types.ObjectId,
      require: true,
    },
    
    Balance:{
      type: Number,
      require: true,
      default:0
    }
  }],
  walletAmount:{
    type:Number,
    require:true,
    default:0
  },
  coupon:{
    type:[String]
  },
  address:[{
    name: {
      type: String,
      require: true,
    },
    email: {
      type: String,
      require: true,
    },
    phone: {
      type: Number,
      require: true,
    },
    
    add1: {
      type: String,
      require: true,
    },
    add2: {
      type: String,
      require: true,
    },
    city: {
      type: String,
      require: true,
    },
    pin_number: {
      type: Number,
      require: true,
    },
  }],
  wishlist: [
    {
      name: {
        type: String,
        required: true,
      },
      price: {
        type: Number,
        required: true,
      },
      photo: [{
        type: String,
        required: true,
      }],
      stock: {
        type: Number,
        required: true,
      },
      productId:{
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      }

     
    },
  ]
  
});

const User = new mongoose.model("user", usersSchema);

module.exports = User;
