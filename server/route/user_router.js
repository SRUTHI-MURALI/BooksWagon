const express = require("express");
const route = express.Router();
const controller = require("../controller/controller");
const usersSchema = require("../model/model");
const productSchema = require("../model/product_model");
const multer = require('multer')
const fs=require('fs')
// multer
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // make sure directory exists
    if (!fs.existsSync('./uploads')) {
      fs.mkdirSync('./uploads');
    }
    cb(null, './uploads');
  },
  filename: function (req, file, cb) {
    // remove spaces and special characters from original filename
    var originalname = file.originalname.replace(/[^a-zA-Z0-9]/g, '');
    // set filename to fieldname + current date + original filename
    cb(null, file.fieldname + "_" + Date.now() + "_" + originalname);
  },
});
var upload = multer({
  storage: storage,
}).single('photo');

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

const userStatus = async (req, res, next) => {
  const id=req.session.userId
  const userModel = await usersSchema.findById( id ).where({isBlocked:true});
  const product = await productSchema.find().limit(6);
  if (userModel) {
    
    req.session.isAuth = false;
    req.session.username = null;
    req.session.userId = null;
    req.session.isLoggedin = false;
    res.render("index", { msg: "User is Blocked", product });
  } else {
    next();
  }
};




route.get("/", isLoggedin, controller.index);
route.get("/sign-up", controller.signUp);
route.post("/api/users", controller.create);
route.get("/login", isLoggedin, controller.login);
route.get("/login_otp_page", controller.loginOtpPage);
route.get("/forget-password", controller.forgetPassword);
route.post("/log_in", controller.findUser);

route.get("/home", isAuth, userStatus, controller.home);

route.get("/product_list", controller.productList);
route.get('/search_user_product', isAuth,controller.searchUserProduct)
route.get('/products_category_filter/:id', isAuth, userStatus, controller.filterProductsByCategory)
route.get('/price_filter', isAuth,userStatus,controller.priceFilter);

route.post('/add_to_wishlist/:id', isAuth, userStatus, controller.addToWishlist)
route.get('/wishlist', isAuth, userStatus, controller.wishlistPage)
route.post('/delete_wishlist_item', isAuth, userStatus, controller.deleteWishlistItem)


route.get("/single-product/:id", controller.singleProduct);

route.post("/get_cart/:id", isAuth, userStatus, controller.getCart);
route.get("/cart",isAuth, userStatus, controller.cart);
route.post(
  "/cart/increase_quantity",
  
  isAuth, userStatus,
  controller.increaseQuantity
);
route.post(
  "/cart/decrease_quantity",
  
  isAuth, userStatus,
  controller.decreaseQuantity
);
route.post("/delete_cart",  isAuth, userStatus, controller.deleteCartItems);
route.get("/empty_cart",  isAuth, userStatus, controller.emptyCart);

route.get("/address_page",isAuth, userStatus,controller.addressPage);
route.post("/add_address", isAuth, userStatus,controller.addNewAddress);

route.post("/checkout", isAuth, userStatus,controller.checkOut);

route.post('/walletpay_initiate', isAuth, userStatus, controller.walletPay)
route.post('/delete_wallet', isAuth, userStatus, controller.deleteWalletPay)
route.get('/Wallet_history', isAuth, userStatus, controller.walletHistory)

route.post("/redeem_coupon",  isAuth, userStatus, controller.redeem_coupon);
route.post('/delete_coupon', isAuth, userStatus, controller.deleteCouponPay)

route.post("/add_order/:id", isAuth, userStatus,controller.addOrder);
route.get('/paypal-success' ,controller.paypal_success)
route.get('/paypal-err',isAuth, userStatus,controller.paypal_err)
route.get("/delete_ordered_item/:id", isAuth, userStatus,controller.deleteOrderedItem);
route.get('/return_order/:id',userStatus, isAuth,controller.returnOrder)
route.get("/user_order",userStatus,isAuth, controller.orderHistory)
route.get('/user_order_details/:id', isAuth, userStatus, controller.userOrderDetails)
route.get('/invoice_download/:id', isAuth, userStatus, controller.userInvoice)


route.get('/user_profile', isAuth, userStatus, controller.userProfile)
route.post('/update_userProfile/:id',upload, isAuth, userStatus, controller.profileUpdateFunction);
route.get('/user_profile_update/:id', userStatus,isAuth, controller.profileUpdate)


route.get("/user_logout", controller.userLogout);















module.exports = route;
