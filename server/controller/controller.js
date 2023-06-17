const bcrypt = require("bcryptjs");
const UsersSchema = require("../model/model");
const ProductSchema = require("../model/product_model");
const CategorySchema = require("../model/add_category_model");
const CartSchema = require("../model/cart_model");
const CouponSchema = require("../model/coupon_model");
const OrderSchema = require("../model/order_model");
const bannerSchema = require("../model/banner_model");
const OfferSchema=require("../model/category_offer")
const ITEMS_PER_PAGE = 10;
const paypal = require("paypal-rest-sdk");
const fs = require("fs");
const { log } = require("console");
require("dotenv").config();

/************** index **************/

exports.index = async (req, res) => {
  const product = await ProductSchema.find().limit(6);
  res.render("index", { product });
};

/************** signup **************/

exports.signUp = (req, res) => {
  res.render("sign-up");
};

/************** create account **************/

exports.create = async (req, res) => {
  const email = req.body.email;
  const phone = req.body.phone;
  const emailfind = await UsersSchema.findOne({ email });
  const phonefind = await UsersSchema.findOne({ phone });
  if (emailfind || phonefind) {
    console.log(emailfind, phonefind);
    res.render("login", { msg: "Phone number or email already existing" });
  } else {
    const saltRounds = 10; // You can adjust the number of salt rounds as needed
    bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
      if (err) {
        res.status(500).send({
          message:
            err.message || "Some error occurred while hashing the password",
        });
        return;
      }

      const user = new UsersSchema({
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        password: hash,
      });
      req.session.user=user
      req.session.phone=phone
      res.redirect('/sendOTP_signup')
        
        
    });
  }
};

/************** login page **************/

exports.login = (req, res) => {
  res.render("login");
};

/************** login with otp **************/

exports.loginOtpPage = (req, res) => {
  res.render("login_otp_page");
};

/************** forgot password **************/

exports.forgetPassword = (req, res) => {
  res.render("forget-password");
};

/************** logged in **************/

exports.findUser = async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  try {
    const user = await UsersSchema.findOne({ email });
    if (!user) {
      return res.redirect("/sign-up");
    } else if (user) {
      const username = user.name;
      const userId = user._id;
      if (user.isBlocked) {
        return res.render("login", { msg: "User is Blocked" });
      } else {
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
          req.session.isAuth = true;
          req.session.username = username;
          req.session.userId = userId;
          req.session.isLoggedin = true;
          res.redirect("/home");
        } else {
          res.redirect("/login");
        }
      }
    }
  } catch (error) {
    console.error(error);
    res.send("An error occurred while logging in.");
  }
};

/************** home **************/

exports.home = async (req, res) => {
  const username = req.session.username;
  const product = await ProductSchema.find().limit(6);
  const banner = await bannerSchema.find().where({ isDeleted: false });
  res.render("home", { product, username, banner });
};

/************** productlist **************/

exports.productList = async (req, res) => {
  const userId=req.session?.userId
  const category = await CategorySchema.find();
  const offer=await OfferSchema.find().populate('category').where({status:'active'})
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * ITEMS_PER_PAGE;
  const user=await UsersSchema.findOne({_id:userId})
  const totalProducts = await ProductSchema.countDocuments();
  const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);

  let product = await ProductSchema.find({
    isDeleted: false,
    stock: { $gte: 1 },
  })
    .populate("category_name")
    .skip(skip)
    .limit(ITEMS_PER_PAGE);
  const username = req.session?.username;
  res.render("product_list", {
    product,
    category,
    username,
    currentPage: page,
    totalPages,
    offer,
    user
  });
};

/************** product search **************/

exports.searchUserProduct = async (req, res) => {
  const query = req.query.name; // Get the search query from the URL query parameters
  const category = await CategorySchema.find();
  const username = req.session?.username;
  // Perform the search using Mongoose
  ProductSchema.find({ name: { $regex: new RegExp(query, "i") } })
    .then((product) => {
      res.render("product_list", { product, category, username });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send("Internal Server Error");
    });
};

/************** Category filter **************/

exports.filterProductsByCategory = async (req, res) => {
  const username = req.session.username;
  try {
    const category = await CategorySchema.find();
    const id = req.params.id;
    const categoryId = await CategorySchema.findOne({ _id: id });
    const offer=await OfferSchema.find().populate('category').where({status:'active'})
    const page = parseInt(req.query.page) || 1;

    const skip = (page - 1) * ITEMS_PER_PAGE;

    const totalProducts = await ProductSchema.find({
      category_name: categoryId,
      isDeleted: false,
      stock: { $gte: 1 },
    })
      .populate("category_name")
      .countDocuments();

    const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);

    const product = await ProductSchema.find({
      category_name: categoryId,
      isDeleted: false,
      stock: { $gte: 1 },
    })
      .populate("category_name")
      .skip(skip)
      .limit(ITEMS_PER_PAGE);

    res.render("product_list", {
      product,
      category,
      username,
      currentPage: page,
      totalPages,
      offer
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: "Internal server error" });
  }
};

/************** price filter **************/

exports.priceFilter = async (req, res) => {
  const username = req.session?.username;
  const category = await CategorySchema.find();
  const page = parseInt(req.query.page) || 1;
  const ITEMS_PER_PAGE = 5; // Define the number of items per page
  const offer=await OfferSchema.find().populate('category').where({status:'active'})
  try {
    const { minPrice, maxPrice } = req.query;
    let filteredProducts = ProductSchema.find().populate("category_name");
    if (minPrice && maxPrice) {
      filteredProducts = filteredProducts
        .where("price")
        .gte(minPrice)
        .lte(maxPrice);
    } else if (minPrice) {
      filteredProducts = filteredProducts.where("price").gte(minPrice);
    } else if (maxPrice) {
      filteredProducts = filteredProducts.where("price").lte(maxPrice);
    }
    const totalProducts = await ProductSchema.countDocuments();
    const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);
    const skip = (page - 1) * ITEMS_PER_PAGE;
    const product = await filteredProducts
      .skip(skip)
      .limit(ITEMS_PER_PAGE)
      .exec();
    res.render("product_list", {
      product,
      category,
      username,
      currentPage: page,
      totalPages,
      offer
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Internal server error" });
  }
};


/************** add to wishlist **************/

exports.addToWishlist = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;
    const user = await UsersSchema.findById(userId);
    const username = req.session.username;
    const product = await ProductSchema.findById(id);

    if (product) {
      const newWishlistItem = {
        productId: id,
        name: product.name,
        price: product.price,
        photo: product.photo.toString(),
        stock: product.stock,
      };

      const isWishlistItem = user.wishlist.some(
        (item) => item.name === product.name
      );

      if (isWishlistItem) {
        return res.redirect("/product_list");
      } else {
        user.wishlist.push(newWishlistItem);
        await user.save({ upsert: true });
        return res.redirect("/product_list");
      }
    } else {
      return res.redirect("/product_list");
    }
  } catch (error) {
    return res.status(500).send({
      message:
        error.message ||
        "Some error occurred while updating the user's wishlist",
    });
  }
};

/************** wishlist page **************/

exports.wishlistPage = async (req, res) => {
  const username = req.session.username;
  const userId = req.session.userId;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * ITEMS_PER_PAGE;

  const totalProducts = await UsersSchema.countDocuments();
  const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);

  const user = await UsersSchema.findById(userId)
    .skip(skip)
    .limit(ITEMS_PER_PAGE);

  res.render("wishlist", { user, username, totalPages, currentPage: page });
};



exports.deleteWishlistItem = async (req, res) => {
  try {
    const { item } = req.body;
    const userId = req.session.userId;

    if (!item) {
      return res.json({ status: false, message: "Product not found" });
    }

    const user = await UsersSchema.findOne({ _id: userId });
    if (!user) {
      return res.json({ status: false, message: "User not found" });
    }
    const productCount = user.wishlist.length - 1;

    const itemIndex = user.wishlist.findIndex((wishlistItem) =>
      wishlistItem._id.equals(item)
    );
    
    if (itemIndex > -1) {
      user.wishlist.splice(itemIndex, 1);
      await user.save();
      return res.json({
        status: true,
        message: "Product removed from wishlist",
        length: productCount,
      });
    } else {
      return res.json({ status: false, message: "Product not found in wishlist" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};


/************** single product **************/

exports.singleProduct = async (req, res) => {
  const id = req.params.id;
  
  try {
    const product = await ProductSchema.findById(id);
    const username = req.session.username;
    res.render("single-product", { product, username });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error retrieving product");
  }
};




/************** go to cart**************/

exports.getCart = async (req, res) => {
  try {
    const userId = req.session.userId;
    const offer=await OfferSchema.find().populate('category')
    
    const { id } = req.params;

    const { quantity } = req.body;

    const product = await ProductSchema.findById(id).populate('category_name')
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    
    let cart = await CartSchema.findOne({ user: userId });
    let price
    let count=0
    offer.forEach((offer)=>{
     if (offer.category._id.toString() === product.category_name._id.toString()){
      
        price=offer.amount
       
        count++
      }
    })
    if(count==0){
      price=product.price
    }
    if (!cart) {
      cart = new CartSchema({
        user: userId,
        items: [
          {
            product: product._id,
            quantity: parseInt(quantity),
            price:price
          },
        ],
      });
    } else {
      const itemIndex = cart.items.findIndex((item) =>
        item.product.equals(product._id)
      );

      if (itemIndex === -1) {
        cart.items.push({
          product: product._id,
          quantity: parseInt(quantity),
          price:price
        });
      } else {
        cart.items[itemIndex].quantity += parseInt(quantity);
      }
    }

    await cart.save({upsert:true});

    res.redirect("/cart");
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

/************** cart page **************/

exports.cart = async (req, res) => {
  const username = req.session?.username;
  const userId = req.session.userId;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * ITEMS_PER_PAGE;
  const offer=await OfferSchema.find()
  const totalProducts = await CartSchema.countDocuments();
  const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);

  const cart = await CartSchema.findOne({ user: userId })
    .populate("items.product")
    .skip(skip)
    .limit(ITEMS_PER_PAGE);

  if (!cart || cart.items.length === 0) {
    res.redirect("/empty_cart");
  } else {
    res.render("cart", {
      username,
      userId,
      cart,
      totalPages,
      currentPage: page,
      
    });
  }
};

/************** cart increment **************/

exports.increaseQuantity = async (req, res, next) => {
  const userId = req.session.userId;
  const cartItemId = req.body.cartItemId;

  try {
    const cart = await CartSchema.findOne({ user: userId }).populate(
      "items.product"
    );

    const cartIndex = cart.items.findIndex((item) =>
      item.product.equals(cartItemId)
    );

    if (cartIndex === -1) {
      return res.json({ success: false, message: "Cart item not found." });
    }

    const product = cart.items[cartIndex].product;
    const maxQuantity = product.stock;

    if (cart.items[cartIndex].quantity >= maxQuantity) {
      return res.json({
        success: false,
        message: "Maximum quantity reached.",
        maxQuantity,
      });
    }

    cart.items[cartIndex].quantity += 1;
    await cart.save();

    const total =
      cart.items[cartIndex].quantity * cart.items[cartIndex].price;
    const quantity = cart.items[cartIndex].quantity;

    res.json({
      success: true,
      message: "Quantity updated successfully.",
      total: parseInt(total),
      quantity,
    });
  } catch (error) {
    res.json({ success: false, message: "Failed to update quantity." });
  }
};

/************** cart decrement **************/

exports.decreaseQuantity = async (req, res, next) => {
  const userId = req.session.userId;
  const cartItemId = req.body.cartItemId;

  try {
    const cart = await CartSchema.findOne({ user: userId }).populate(
      "items.product"
    );

    const cartIndex = cart.items.findIndex((item) =>
      item.product.equals(cartItemId)
    );

    if (cartIndex === -1) {
      return res.json({ success: false, message: "Cart item not found." });
    }

    cart.items[cartIndex].quantity -= 1;
    await cart.save();

    const total =
      cart.items[cartIndex].quantity * cart.items[cartIndex].price;
    const quantity = cart.items[cartIndex].quantity;

    res.json({
      success: true,
      message: "Quantity updated successfully.",
      total: parseInt(total),
      quantity,
    });
  } catch (error) {
    res.json({ success: false, message: "Failed to update quantity." });
  }
};

/************** delete cart item **************/

exports.deleteCartItems = async (req, res) => {
  try {
    const { product } = req.body;
    const userId = req.session.userId;
    const userProduct = await ProductSchema.findById(product).select("price");

    if (!userProduct) {
      res.send({ message: "product not found" });
    }
    const userCart = await CartSchema.findOne({ user: userId });

    const productCount = userCart.items.length - 1;

    if (userCart) {
      const itemIndex = userCart.items.findIndex((item) =>
        item.product.equals(product)
      );

      if (itemIndex > -1) {
        userCart.items.splice(itemIndex, 1);
        await userCart.save();
        res.json({
          status: true,
          message: "product removed from cart",
          length: productCount,
        });
      } else {
        res.json({ status: false, message: "product not found" });
      }
    } else {
      res.json({ status: false, message: "cart not found" });
    }
  } catch (error) {
    console.log("error");
  }
};

/************** empty cart **************/
exports.emptyCart = (req, res) => {
  const username = req.session?.username;
  const userId = req.session.userId;
  res.render("empty_cart", { username, userId });
};

/************** address page **************/

exports.addressPage = async (req, res) => {
  const username = req.session?.username;
  const userId = req.session.userId;
  const address = await UsersSchema.findById(userId);

  res.render("address_page", { username, userId, address });
};

/************** add new address **************/

exports.addNewAddress = async (req, res) => {
  const userId = req.session.userId;
  const user = await UsersSchema.findById(userId);
  if (user) {
    const newAddress = {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      add1: req.body.add1,
      add2: req.body.add2,
      city: req.body.city,
      pin_number: req.body.pin_number,
    };

    // Check if the address with the same add1 already exists
    const isAddressExist = user.address.some(
      (address) => address.add1 === req.body.add1
    );

    if (isAddressExist) {
      res.redirect("/address_page");
    } else {
      user.address.push(newAddress);

      try {
        await user.save();
        res.redirect("/address_page");
      } catch (error) {
        res.status(500).send({
          message:
            error.message ||
            "Some error occurred while updating the users address",
        });
      }
    }
  } else {
    res.redirect("/address_page");
  }
};

/************** delete new address **************/

exports.deleteaddress= async (req, res) => {
  try {
    const { item } = req.body;
    const userId = req.session.userId;

    if (!item) {
      return res.json({ status: false, message: "address not found" });
    }

    const user = await UsersSchema.findOne({ _id: userId });

 
    if (!user) {
      return res.json({ status: false, message: "User not found" });
    }
    const addressIndex = user.address.findIndex(address =>address._id.toString() === item);

    if (addressIndex === -1) {
      return res.json({ status: false, message: "Address not found" });
    }

    // Remove the address from the user's address array
    user.address.splice(addressIndex, 1);

    // Save the updated user object
    await user.save();

    return res.json({
      status: true,
      message: "Address removed successfully",
    });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/************** check out page **************/

exports.checkOut = async (req, res) => {
  const id = req.body.selectedAddress;
  const offer=await OfferSchema.find().populate('category')
  const userId = req.session.userId;
  const username = req.session?.username;
  const user = await UsersSchema.findById(userId);

  const addressIndex = user.address.findIndex((item) => item._id.equals(id));
  const specifiedAddress = user.address[addressIndex];
  const cart = await CartSchema.findOne({ user: userId }).populate(
    "items.product"
  );
  const coupon = await CouponSchema.find();
  let couponfind = [];
  let discount = [];
  coupon.forEach((CouponItem) => {
    let couponExists = false;
    user.coupon.forEach((usercoupon) => {
      if (usercoupon === CouponItem.coupon_code) {
        couponExists = true;
      }
    });

    if (!couponExists) {
      couponfind.push(CouponItem.coupon_code);
      discount.push(CouponItem.discount);
    }
  });

  res.render("checkout", {
    username,
    userId,
    specifiedAddress,
    cart,
    couponfind,
    discount,
  });
};

/************** wallet pay initiate **************/

exports.walletPay = async (req, res) => {
  const userId = req.session.userId;
  const user = await UsersSchema.findById({ _id: userId });
  const walletBalance = user.walletAmount;
  const cart = await CartSchema.findOne({ user: userId }).populate(
    "items.product"
  );

  let totalPrice = 0;
  const items = cart.items.map((item) => {
    const product = item.product;
    const quantity = item.quantity;
    const price = item.price;

    totalPrice += price * quantity;
  });

  let sum = (10 / 100) * totalPrice;
  if (sum < walletBalance) {
    totalPrice -= sum;
    totalPrice + 50;
    cart.walletAmt = totalPrice;
    await cart.save();

    user.walletAmount -= sum;
    await user.save();
  }

  res.json({
    success: true,
    message: "Wallet add Successfull",
    totalPrice,
    walletBalance,
  });
};

/************** delete wallet pay **************/

exports.deleteWalletPay = async (req, res) => {
  const userId = req.session.userId;
  const user = await UsersSchema.findById({ _id: userId });

  const cart = await CartSchema.findOne({ user: userId }).populate(
    "items.product"
  );

  let totalPrice = 0;
  const items = cart.items.map((item) => {
    const product = item.product;
    const quantity = item.quantity;
    const price = item.price;

    totalPrice += price * quantity;
  });
  let sum = (10 / 100) * totalPrice;

  totalPrice + 50;
  cart.walletAmt = totalPrice;
  await cart.save();

  user.walletAmount += sum;
  await user.save();

  res.json({
    success: true,
    message: "wallet deleted successfully.",
    totalPrice,
  });
};

/************** wallet history **************/

exports.walletHistory = async (req, res) => {
  const username = req.session?.username;
  const userId = req.session.userId;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * ITEMS_PER_PAGE;

  const totalProducts = await OrderSchema.find({
    $and: [
      { user: userId },
      {
        $or: [{ isWallet: "debit" }, { isWallet: "credit" }],
      },
    ],
  })
    .where({ walletused: { $ne: 0 } })
    .countDocuments();
  const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);

  const order = await OrderSchema.find({
    $and: [
      { user: userId },
      {
        $or: [{ isWallet: "debit" }, { isWallet: "credit" }],
      },
    ],
  })
    .where({ walletused: { $ne: 0 } })
    .skip(skip)
    .limit(ITEMS_PER_PAGE);

  const user = await UsersSchema.findById(userId);
  res.render("wallet_history", {
    username,
    order,
    user,
    totalPages,
    currentPage: page,
  });
};

/************** redeem coupon **************/

exports.redeem_coupon = async (req, res) => {
  const { coupon } = req.body;
  const userId = req.session.userId;

  try {
    const couponFind = await CouponSchema.findOne({ coupon_code: coupon });
    const userCoupon = await UsersSchema.findById(userId);

    if (!couponFind || couponFind.status === "inactive") {
      return res.json({
        success: false,
        message: couponFind ? "Coupon Deactivated" : "Coupon not found",
      });
    }

    const currentDate = new Date();
    const expirationDate = new Date(couponFind.expiry_date);

    if (currentDate > expirationDate) {
      return res.json({
        success: false,
        message: "Coupon Expired",
      });
    }

    if (userCoupon.coupon.includes(coupon)) {
      return res.json({
        success: false,
        message: "Coupon already used",
      });
    }

    const amount = parseInt(couponFind.discount);

    res.json({
      success: true,
      message: "Coupon used",
      couponFind,
      amount,
    });

    const cart = await CartSchema.findOne({ user: userId });

    if (cart) {
      cart.total = amount;
      await cart.save();
    }

    userCoupon.coupon.push(coupon);
    await userCoupon.save();
  } catch (error) {
    console.error("Error redeeming coupon:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/************** delete coupon pay **************/

exports.deleteCouponPay = async (req, res) => {
  const userId = req.session.userId;
  const userCoupon = await UsersSchema.findById(userId);
  const coupon = userCoupon.coupon.pop();
  userCoupon.save();

  const cart = await CartSchema.findOne({ user: userId }).populate(
    "items.product"
  );
  let totalPrice = 0;
  const items = cart.items.map((item) => {
    const product = item.product;
    const quantity = item.quantity;
    const price = item.price;

    totalPrice += price * quantity;
  });

  totalPrice += 50;
  
  cart.total = 0;
  cart.save();

  res.json({
    success: true,
    message: "coupon deleted successfully.",
    totalPrice,
  });
};

/************** add order **************/

let paypalTotal = 0;

exports.addOrder = async (req, res) => {
  const id = req.params.id;
  const userId = req.session.userId;
  const paymentMethod = req.body.payment_method;
  const product = await ProductSchema.find();
  const user = await UsersSchema.findById(userId);
  const addressIndex = user.address.findIndex((item) => item._id.equals(id));
  const specifiedAddress = user.address[addressIndex];
  const cart = await CartSchema.findOne({ user: userId }).populate(
    "items.product"
  );
  const Totalwallet = user.walletAmount;
  const couponAmt = cart.total;

  let totalPrice = 0;
  let walletUsed = 0;
  const items = cart.items.map((item) => {
    const product = item.product;
    const quantity = item.quantity;
    const price = item.price;

    totalPrice += price * quantity;

    return {
      product: product._id,
      quantity: parseInt(quantity),
      price,
    };
  });
  let isWallet = "nil";

  if (cart.walletAmt != totalPrice && cart.walletAmt != 0) {
    (walletUsed = totalPrice - cart.walletAmt), (totalPrice = cart.walletAmt);

    isWallet = "debit";
  }

  if (couponAmt) {
    totalPrice -= couponAmt;
  }

  if (paymentMethod === "cod") {
    const order = new OrderSchema({
      user: userId,
      items,
      total: totalPrice + 50,
      status: "Pending",
      createdAt: new Date(),
      shipping_charge: 50,
      payment_method: paymentMethod,
      address: specifiedAddress,
      walletused: isNaN(walletUsed) ? 0 : walletUsed,
      isWallet,
      walletTotal: Totalwallet,
    });

    await order.save({ upsert: true });
    await cart.items.map(async (item) => {
      let stock = item.product.stock - item.quantity;

      await ProductSchema.findByIdAndUpdate(
        item.product._id,
        {
          stock: stock,
        },
        { new: true }
      );
    });

    await cart.deleteOne({ user: userId });

    res.render("confirmation", { specifiedAddress, cart, order });
  } else if (paymentMethod === "paypal") {
    let createPayment = {};

    const order = new OrderSchema({
      user: userId,
      items,
      total: totalPrice + 50,
      status: "Pending",
      createdAt: new Date(),
      shipping_charge: 50,
      payment_method: paymentMethod,
      address: specifiedAddress,
      walletused: isNaN(walletUsed) ? 0 : walletUsed,
      isWallet,
      walletTotal: Totalwallet,
    });

    await order.save({ upsert: true });
    await cart.items.map(async (item) => {
      let stock = item.product.stock - item.quantity;

      await ProductSchema.findByIdAndUpdate(
        item.product._id,
        {
          stock: stock,
        },
        { new: true }
      );
    });
    cart.items.forEach((element) => {
      paypalTotal += totalPrice;
    });

    createPayment = {
      intent: "sale",
      payer: {
        payment_method: "paypal",
      },
      redirect_urls: {
        return_url: `https://bookswagon.online/paypal-success/${userId}`,
        cancel_url: "https://bookswagon.online/paypal-err",
      },
      transactions: [
        {
          amount: {
            currency: "USD",
            total: (paypalTotal / 82).toFixed(2), // Divide by 82 to convert to USD
          },
          description: "Super User Paypal Payment",
        },
      ],
    };

    paypal.payment.create(createPayment, function (error, payment) {
      if (error) {
        throw error;
        console.log(error);
      } else {
        for (let i = 0; i < payment.links.length; i++) {
          if (payment.links[i].rel === "approval_url") {
            res.redirect(payment.links[i].href);
          }
        }
      }
    });

    await CartSchema.deleteOne({ user: userId });
  }
};

/************** paypal success **************/

exports.paypal_success = async (req, res) => {

  const userId = req.params.id;
  console.log(userId);
  const user = await UsersSchema.findById(userId)
  req.session.username = user.name
  req.session.isAuth = true;  
  req.session.userId = userId;
  req.session.isLoggedin = true;
  const payerId = req.query.PayerID;
 const  username=req.session.username
  const paymentId = req.query.paymentId;

  res.render("paypalSuccess", { payerId, username, userId });
};

/************** paypal failed **************/

exports.paypal_err = (req, res) => {
  res.send("error");
};

/************** delete ordered item **************/

exports.deleteOrderedItem = async (req, res) => {
  const id = req.params.id;
  const order = await OrderSchema.findById(id).populate("user");
  const payment = order.payment_method;

  if (payment === "cod") {
    await OrderSchema.findByIdAndUpdate(
      id,
      { status: "cancelled" },
      { new: true }
    )
      .then((updatedOrder) => {
        res.redirect("/user_order");
      })
      .catch(() => res.status(500).send("Failed to update order."));
  } else {
    const refundAmount = order.total;
    let bal = order.user.walletAmount;
    const updatedWalletAmount = bal + refundAmount;

    await UsersSchema.findByIdAndUpdate(
      order.user._id,
      {
        $push: {
          wallet: {
            id: order._id,
            Balance: refundAmount,
          },
        },
        $set: { walletAmount: updatedWalletAmount },
      },
      { new: true }
    );

    await OrderSchema.findByIdAndUpdate(
      id,
      { status: "cancelled" },
      { new: true }
    )
      .then((updatedOrder) => {
        res.redirect("/user_order");
      })
      .catch(() => res.status(500).send("Failed to update order."));
  }
};

/************** return order **************/

exports.returnOrder = async (req, res) => {
  const username = req.session?.username;
  const userId = req.session.userId;
  const id = req.params.id;

  OrderSchema.findByIdAndUpdate(
    id,
    {
      status: "Return",
    },
    { new: true }
  )
    .then((updatedUser) => {
      res.redirect("/user_order");
    })
    .catch(() => res.status(500).send("Failed to update order."));
};

/************** order history **************/

exports.orderHistory = async (req, res) => {
  const username = req.session?.username;
  const userId = req.session.userId;

  try {
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * ITEMS_PER_PAGE;

    const totalProducts = await OrderSchema.find({
      user: userId,
    }).countDocuments();
    const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);
    const orders = await OrderSchema.find({ user: userId })
      .populate("items.product")
      .skip(skip)
      .limit(ITEMS_PER_PAGE);

    res.render("order_history", {
      username,
      userId,
      orders,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    // Handle error
    console.error(error);
  }
};

/************** order details page **************/

exports.userOrderDetails = async (req, res) => {
  const username = req.session?.username;
  const { id } = req.params;

  const orders = await OrderSchema.findById(id)
    .populate({ path: "items.product" })
    .populate({ path: "user" });

  res.render("userOrderDetails", { orders, username });
};

/************** user invoice **************/

exports.userInvoice = async (req, res) => {
  const { id } = req.params;
  const userId = req.session.userId;

  const username = req.session.username;
  const order = await OrderSchema.findById(id).populate("items.product");

  const user = await UsersSchema.findById(userId);

  res.render("user_invoice", { username, order });
};

/************** user profile **************/

exports.userProfile = async (req, res) => {
  const username = req.session?.username;
  const userId = req.session.userId;
  const user = await UsersSchema.findById(userId);

  const address = await UsersSchema.findById(userId);
  res.render("user_profile", { username, user, address });
};

/************** updating user profile **************/

exports.profileUpdateFunction = async (req, res) => {
  let new_image = "";
  if (req.file) {
    new_image = req.file.filename;

    try {
      fs.unlinkSync("./uploads/" + req.body.photo);
    } catch (error) {
      console.log(error);
    }
  } else {
    new_image = req.body.photo;
  }

  const userId = req.session.userId;
  // const photo=req.file.filename
  const { username, phone, email, gender, acc } = req.body;

  try {
    const updatedProfile = await UsersSchema.findByIdAndUpdate(
      userId,
      {
        name: username,
        phone,
        email,
        gender,
        account_no: acc,
        photo: new_image,
      },
      { new: true }
    );

    if (updatedProfile) {
      res.redirect("/user_profile");
    } else {
      res.redirect("/user_profile");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/************** user profile update **************/

exports.profileUpdate = async (req, res) => {
  const { id } = req.params;

  const username = req.session?.username;
  const userId = req.session.userId;
  const user = await UsersSchema.findById(userId);
  const address = await UsersSchema.findById(userId);
  res.render("personal_information", { username, user, address });
};

/************** log out **************/

exports.userLogout = (req, res) => {
  req.session.isAuth = false;
  req.session.username = null;
  req.session.userId = null;
  req.session.isLoggedin = false;
  res.redirect("/");
};







