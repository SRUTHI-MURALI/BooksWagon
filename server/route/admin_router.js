const express = require("express");
const route = express.Router();

const admin_controller=require('../controller/admin_controller')

const category=require('../model/add_category_model')

const multer = require('multer');
var fs = require('fs');


const connect = require("../connection/connection");

// image upload
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // make sure directory exists
    if (!fs.existsSync("./uploads")) {
      fs.mkdirSync("./uploads");
    }
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    // remove spaces and special characters from original filename
    var originalname = file.originalname.replace(/[^a-zA-Z0-9]/g, "");
    // set filename to fieldname + current date + original filename
    cb(null, file.fieldname + "_" + Date.now() + "_" + originalname);
  },
});
var upload = multer({
  storage: storage,
}).array('photo',10)




const isAuth=(req,res,next)=>{
  if(req.session.isAuth){
    next()
  }else{
    res.redirect('/admin_signin')
    
  }
}



route.get("/admin_signin",admin_controller.adminSignIn)
route.post("/admin_login",admin_controller.adminLogin)
route.get("/admin_index",isAuth,admin_controller.adminIndex)

route.get("/sales_report",isAuth,admin_controller.salesReportPage)
route.post('/filter_salesreport', isAuth, admin_controller.filterSalesReport);

route.get("/category",isAuth, admin_controller.findCategory)
route.get("/add_category",isAuth,admin_controller.addCategoryPage)
route.post("/add_category_submit",isAuth,admin_controller.addCategory);
route.post("/update_category/:id",isAuth,admin_controller.updatecategory);
route.get("/edit/:id",isAuth,admin_controller.editCategory )
route.get("/delete_category/:id",isAuth, admin_controller.deletecategory)

route.get("/product",isAuth, admin_controller.find_product)
route.get("/add_product_page",isAuth, admin_controller.addproductpage)
route.post("/add_product_submit",isAuth, upload, admin_controller.addproduct);
route.get("/edit_product/:id",isAuth,upload,admin_controller.edit_product);
route.post("/update_product/:id",isAuth,upload,admin_controller.updateproduct);
route.get("/unlist_product/:id",isAuth,admin_controller.unlistProduct)
route.get("/list_product/:id",isAuth,admin_controller.listProduct)

route.get("/user",isAuth,admin_controller.find_user)
route.get("/block_user/:id",isAuth,admin_controller.block_user)
route.get("/unblock_user/:id",isAuth,admin_controller.unblock_user)

route.get("/order",isAuth,admin_controller.find_order)
route.get("/order_details/:id",isAuth,admin_controller.orderDetails)
route.post("/admin/order/edit_status/:id",isAuth,admin_controller.editOrderStatus)
route.get("/refund_order/:id",isAuth,admin_controller.refundOrder)


route.get('/search_admin_product', isAuth,admin_controller.searchAdminProduct)
route.get('/search_admin_user', isAuth,admin_controller.searchAdminUser)
route.get('/search_admin_category', isAuth,admin_controller.searchAdminCategory)

route.post('/sort',isAuth,admin_controller.sortProduct)
route.get('/filter', isAuth, admin_controller.filterProduct);
route.get('/filter_orders', isAuth, admin_controller.filterOrder);

route.get("/coupon",admin_controller.getCoupon)
route.get('/add_coupon',admin_controller.addCouponPage)
route.post('/add_coupon_submit',admin_controller.addCoupon)
route.get("/inactivate_coupon/:id",isAuth,admin_controller.inactivateCoupon)
route.get("/activate_coupon/:id",isAuth,admin_controller.activateCoupon)

route.get("/offer",admin_controller.getOffer)
route.get('/add_offer',admin_controller.addOfferPage)
route.post('/add_offer_submit',admin_controller.addOffer)
route.get("/inactivate_offer/:id",isAuth,admin_controller.inactivateOffer)
route.get("/activate_offer/:id",isAuth,admin_controller.activateOffer)


route.get("/banner",admin_controller.getbanner)
route.get("/add_banner",admin_controller.addBannerPage)
route.post("/add_banner_submit",upload,admin_controller.addBannerImage)
route.get("/edit_banner/:id",isAuth,upload,admin_controller.editBannerPage);
route.post("/update_banner/:id",isAuth,upload,admin_controller.updateBanner);
route.get("/unlist_banner/:id",isAuth,admin_controller.unlistBanner)
route.get("/list_banner/:id",isAuth,admin_controller.listBanner)

route.get("/logout",isAuth,admin_controller.logout)


module.exports = route;
