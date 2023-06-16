const categorySchema = require('../model/add_category_model')
const usersSchema = require('../model/model')
const productSchema = require('../model/product_model')
const orderSchema = require('../model/order_model')
const CouponSchema = require('../model/coupon_model')
const bannerSchema = require('../model/banner_model')
const Offerschema = require('../model/category_offer')
const multer = require('multer')
const { startOfMonth: start, endOfMonth } = require('date-fns');
const ITEMS_PER_PAGE = 4; // Number of orders to display per page
const fs = require('fs')
const { log } = require('console')
const sharp = require('sharp');

// multer
var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads')
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now())
  },
})

var upload = multer({
  storage: storage,
}).array('image', 10)

/************** sign in **************/

exports.adminSignIn = (req, res) => {
  res.render('admin_signin')
}

/************** logged in **************/

exports.adminLogin = (req, res) => {
  const email = req.body.email


  const password = req.body.password
 

  try {
    if (email === 'admin123@gmail.com') {
      if (password === "123456789") {
        req.session.isAuth = true;
        res.redirect('/admin_index');
      }else {
       
        res.render('admin_signin', { message: 'Invalid entry' })
    } 
    }else{
      res.render('admin_signin', { message: 'Invalid entry' })
    }
  } catch (error) {
    console.error(error)
    res.send('An error occurred while logging in.')
  }
}

/************** dashboard **************/

exports.adminIndex = async (req, res) => {
  const pagename='Index'
  try {
    // Retrieve orders for the current month
    const startDate = start(new Date());
    const endDate = endOfMonth(new Date());

    const orders = await orderSchema
      .find()
      .populate('user')
      .populate('items.product');
 
    // Calculate total price and count of orders
    let totalPrice = 0;
    let totalOrders = 0;
    orders.forEach((order) => {
   
      totalPrice += order.total;
      totalOrders++;
    });
    // Retrieve total count of users
    const totalUsers = await usersSchema.countDocuments();

    // Retrieve sales data for the current month
    const salesData = await orderSchema.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'delivered', // Consider only delivered orders for sales data
        },
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Format sales data into an object with month abbreviations as keys
    const formattedSalesData = {};
    let months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    var monthAbbreviation
    salesData.forEach((item) => {
       monthAbbreviation = new Date(0, item._id - 1).toLocaleString('default', { month: 'short' });
     
      
      formattedSalesData[monthAbbreviation] = item.count;
      
    });
    let monthlySales = {}
      months.map((month) => {
        if(formattedSalesData[month]){
          monthlySales[month] = formattedSalesData[month]
        } else {
          monthlySales[month] = 0
        }
      });

   
    
        // pie chart


    // Other calculations for order status counts
    let deliveredCounts = 0;
    let placedCounts = 0;
    let cancelledCounts = 0;
    let returnCounts = 0;
    orders.forEach((order) => {
      if (order.status === 'delivered') {
        deliveredCounts++;
      } else if (order.status === 'Pending') {
        placedCounts++;
      } else if (order.status === 'cancelled') {
        cancelledCounts++;
      } else if (order.status === 'Returned') {
        returnCounts++;
      }
    });

    const data = {
      deliveredCounts,
      placedCounts,
      cancelledCounts,
      returnCounts,
    };

   res.render('admin_index', {
      
      data,
      orders,
      totalPrice,
      totalUsers,
      totalOrders,
      monthlySales,
      monthAbbreviation,
      pagename
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching data');
  }
};

/************** sales report **************/

exports.salesReportPage= async (req, res) => {
  const pagename='Sales Report'
  try {
    // Retrieve sales data from the database
    const salesData = await orderSchema.find().where({status:"delivered"}).populate('user')
  const   startdate=""
   const enddate=""
    // Render the EJS template with the sales data
    res.render('sales_report', { salesData,pagename,startdate,enddate });
  } catch (error) {
    // Handle any errors that occur during the process
    console.error(error);
    res.status(500).send('Error generating sales report');
  }
};

/************** sales report filter **************/


exports.filterSalesReport = async (req, res) => {
  
  const pagename='Sales Report'
  try {
    const { startdate, enddate } = req.query;
    
    

    let query = orderSchema.find({ status: "delivered" }).populate('user');

    if (startdate && enddate) {
      query = query.where('createdAt').gte(new Date(startdate)).lte(new Date(enddate));
    } else if (startdate) {
      query = query.where('createdAt').gte(new Date(startdate));
    } else if (enddate) {
      query = query.where('createdAt').lte(new Date(enddate));
    }

    
    
   
    const salesData = await query.exec();
    
   
   res.render('sales_report',{salesData,startdate,enddate,pagename})
   
   
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Internal server error' });
  }
};






/************** category page **************/

exports.findCategory = (req, res) => {
  const pagename='Category'
  categorySchema
    .find()
    .then((category_find) => {
      res.render('category', { category_find,pagename })
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message || 'error occured while retrieving user information',
      })
    })
}

/************** add new category **************/

exports.addCategoryPage = (req, res) => {
  const pagename='Add Category'
  res.render('add_category',{pagename})
}

/************** adding category **************/

exports.addCategory = (req, res) => {
  const category = new categorySchema ({
    category: req.body.category,
    description: req.body.description
  })

  category
    .save()
    .then((result) => {
      res.redirect('/category')
    })
    .catch((error) => {
      res.status(500).json({
        error : error
      })
    })
}

/************** edit category page**************/

exports.editCategory = async (req, res) => {
  const pagename='Edit Category'
  try {
    const { id } = req.params

    const user = await categorySchema.findById(id)
    if (user == null) {
      res.redirect('/category')
    } else {
      res.render('update_category', { user ,pagename})
    }
  } catch (err) {
    res.redirect('/category')
    console.log(err) // log the error for debugging purposes}
  }
}

/************** editing category **************/

exports.updatecategory = (req, res) => {
  const { id } = req.params

  categorySchema
    .findByIdAndUpdate(id, {
      category: req.body.category,
      description: req.body.description,
    })
    .then(() => {
      res.redirect('/category')
    })
    .catch((error) => {
      res.send(error)
    })
}

/************** delete category **************/

exports.deletecategory = async (req, res) => {
  try {
    const id = req.params.id
    const check = await productSchema.find().populate('category_name')
    const r = await categorySchema.findById(id)
    let found = false

    check.forEach((checkItem) => {
      if (checkItem.category_name.category === r.category) {
        found = true
      }
    })

    if (!found) {
      const result = await categorySchema.findByIdAndRemove(id)

      if (result) {
        res.redirect('/category')
      } else {
        res.redirect('/category')
      }
    } else {
      res.status(500).send(console.error)
    }
  } catch (err) {
    res.status(500).send(err.message)
  }
}

/************** product page **************/

exports.find_product = async (req, res) => {
  const pagename='Product'
  
  try {
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * ITEMS_PER_PAGE;

    const totalProducts = await productSchema.countDocuments();
    const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);

    const product_data = await productSchema
      .find()
      .populate('category_name')
      .skip(skip)
      .limit(ITEMS_PER_PAGE);

    res.render('product', { product_data, totalPages, currentPage: page,pagename });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }

}


/************** add product page **************/

exports.addproductpage = async (req, res) => {
  const pagename='Add product'
  try {
    const data = await categorySchema.find()

    res.render('add_product', { data,pagename })
  } catch (err) {
    console.error(err)
    res.status(500).send('Server Error')
  }
}


/************** adding new product **************/

exports.addproduct = async (req, res) => {

  const croppedImages = [];
    for (const file of req.files) {
      const croppedImage = `cropped_${file.filename}`;

      await sharp(file.path)
        .resize(500, 600, { fit: "cover" })
        .toFile(`uploads/${croppedImage}`);

      croppedImages.push(croppedImage);
    }


   
  try {
    const product = new productSchema({
      name: req.body.name,
      price: req.body.price,
      category_name: req.body.category,
      description: req.body.description,
      stock:req.body.stock,

      photo: croppedImages
    })
    await product.save()

    res.redirect('/product')
  } catch (err) {
    console.log(err)
    res.status(500).send({
      message:
        err.message || 'Some error occurred while creating a create operation',
    })
  }
}


/************** edit product page **************/


exports.edit_product = async (req, res) => {
  const pagename='Edit Product'
  try {
    const { id } = req.params
    const user = await productSchema.findById(id).populate('category_name')
    const category = await categorySchema.find()
    const categoryName = user.category_name.category
    
    if (!user) {
      return res.redirect('/product')
    }

    return res.render('update_product', { user, category, categoryName,pagename })
  } catch (err) {
    console.error(err)
    return res.redirect('/product')
  }
}

/************** editing product **************/

exports.updateproduct = async (req, res) => {
  let croppedImages = []; 
  if(req.files && req.files.length >0){
   
    for (const file of req.files) {
      const croppedImage = `cropped_${file.filename}`;

      await sharp(file.path)
        .resize(500, 600, { fit: "cover" })
        .toFile(`uploads/${croppedImage}`);

      croppedImages.push(croppedImage);
    }
  }else{
      croppedImages=req.body.photo
  }
  

  try {
    const { id } = req.params
    

    // Convert category name to ObjectId
    const category = await categorySchema.findOne({
      category: req.body.category
    })
    const categoryId = category ? category._id : null

    // Update the product using findByIdAndUpdate
    const updatedProduct = await productSchema.findByIdAndUpdate(
      id,
      {
        name: req.body.name,
        price: req.body.price,
        description: req.body.description,
        category_name: categoryId, // Use category ID instead of category name
        photo: croppedImages,
        stock:req.body.stock,
      },
      { upsert: true }
    )

    // Set { new: true } to return the updated document

    if (updatedProduct) {
      res.redirect('/product')
    } else {
      res.redirect('/product')
    }
  } catch (error) {
    console.error(error)
    res.send(error)
  }
}

/************** unlisting product **************/

exports.unlistProduct = (req, res) => {
  const { id } = req.params

  productSchema
    .findByIdAndUpdate(
      id,
      {
        isDeleted: true
      },
      { new: true }
    )
    .then((updatedUser) => {
      res.redirect('/product')
    })
    .catch((error) => {
      console.error(error)
      res.status(500).send('Failed to update user.')
    })
}


/************** listing product **************/


exports.listProduct = (req, res) => {
  const { id } = req.params

  productSchema
    .findByIdAndUpdate(
      id,
      {
        isDeleted: false,
      },
      { new: true }
    )
    .then((updatedUser) => {
      res.redirect('/product')
    })
    .catch((error) => {
      console.error(error)
      res.status(500).send('Failed to update user.')
    })
}


/************** user page **************/

exports.find_user = async (req, res) => {
  
  const pagename='User Details'
  try {
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * ITEMS_PER_PAGE;

    const totalUsers = await usersSchema.countDocuments();
    const totalPages = Math.ceil(totalUsers / ITEMS_PER_PAGE);

    const user_data = await usersSchema
      .find()
      
      .skip(skip)
      .limit(ITEMS_PER_PAGE);

    res.render('user', { user_data, totalPages, currentPage: page,pagename });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }

}


/************** block user **************/


exports.block_user = (req, res) => {
  const { id } = req.params

  usersSchema
    .findByIdAndUpdate(
      id,
      {
        isBlocked: true
      },
      { new: true }
    )
    .then((updatedUser) => {
      res.redirect('/user')
    })
    .catch((error) => {
      console.error(error)
      res.status(500).send('Failed to update user.')
    })
}

/************** unblock user **************/

exports.unblock_user = (req, res) => {
  const { id } = req.params

  usersSchema
    .findByIdAndUpdate(
      id,
      {
        isBlocked: false
      },
      { new: true }
    )

    .then((updatedUser) => {
      res.redirect('/user')
    })
    .catch((error) => {
      console.error(error)
      res.status(500).send('Failed to update user.')
    })
}



/************** order page **************/


exports.find_order = async (req, res) => {
  const pagename='Order'
  try {
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * ITEMS_PER_PAGE;

    const totalOrders = await orderSchema.countDocuments();
    const totalPages = Math.ceil(totalOrders / ITEMS_PER_PAGE);

    const orders = await orderSchema
      .find()
      .populate('user')
      .skip(skip)
      .limit(ITEMS_PER_PAGE);

    res.render('order', { orders, totalPages, currentPage: page,pagename });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};

/************** order details **************/

exports.orderDetails = async (req, res) => {
  const pagename='Order Details'
  const { id } = req.params


  const orders = await orderSchema.findById(id).populate({ path: 'items.product' }).populate({path:'user'})

  res.render('order_details', { orders,pagename })
}


/************** edit order **************/ 

exports.editOrderStatus = (req, res) => {
  const id = req.params.id
  const newstatus = req.body.status
  
  orderSchema
    .findByIdAndUpdate(
      id,
      {
        status: newstatus
      },
      { new: true }
    )

    .then((updatedUser) => {
      res.redirect('/order')
    })
    .catch((error) => {
      console.error(error)
      res.status(500).send('Failed to update user.')
    })
}

/************** refund order **************/


exports.refundOrder = async (req, res) => {
  const id = req.params.id;
  
  try {
    const order = await orderSchema.findById(id).populate('user');
    const refundAmount = order.total;
    let bal = order.user.walletAmount;

   

    const updatedWalletAmount = bal + refundAmount;
    

   order.isWallet='credit'
   order.walletused=refundAmount
   order.walletTotal=updatedWalletAmount
   await order.save({upsert:true})

    await usersSchema.findByIdAndUpdate(
      order.user._id, // Use order.user._id instead of order.user
      {
        $push: {
          wallet: {
            id: order._id,
            Balance: refundAmount
          }
        },
        $set: { walletAmount: updatedWalletAmount }
      },
      { new: true }
    );

    await orderSchema.findByIdAndUpdate(
      id,
      {
        status: 'Returned'
      },
      { new: true }
    );

    res.redirect('/order');
  } catch (error) {
    console.error(error);
    res.status(500).send('Failed to update user.');
  }
};

/************** search product **************/

exports.searchAdminProduct = (req, res) => {
  const pagename='Product'
  const query = req.query.name // Get the search query from the URL query parameters

  // Perform the search using Mongoose
  productSchema
    .find({ name: { $regex: new RegExp(query, 'i') } })
    .then((product_data) => {
      res.render('product',{product_data,pagename})
    })
    .catch((err) => {
      console.error(err)
      res.status(500).send('Internal Server Error')
    })
}


/************** search user **************/

exports.searchAdminUser = (req, res) => {
  const pagename='User Details'
  const query = req.query.name // Get the search query from the URL query parameters

  // Perform the search using Mongoose
  usersSchema
    .find({ name: { $regex: new RegExp(query, 'i') } })
    .then((user_data) => {
      res.render('user',{user_data,pagename})
    })
    .catch((err) => {
      console.error(err)
      res.status(500).send('Internal Server Error')
    })
}

/************** search category **************/

exports.searchAdminCategory = (req, res) => {
  const pagename='Category'
  const query = req.query.name // Get the search query from the URL query parameters

  // Perform the search using Mongoose
  categorySchema
    .find({ category: { $regex: new RegExp(query, 'i') } })
    .then((category_find) => {
      res.render('category',{category_find,pagename})
    })
    .catch((err) => {
      console.error(err)
      res.status(500).send('Internal Server Error')
    })
}

/************** sort product **************/

exports.sortProduct = async (req, res) => {

  const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * ITEMS_PER_PAGE;

    const totalProducts = await productSchema.countDocuments();
    const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);

  const pagename='product'
  try {
    const one = req.body.sort

    let sortField
    switch (one) {
      case 'name':
        sortField = 'name'
        break
      case 'price':
        sortField = 'price'
        break
      case 'category':
        sortField = 'category_name.category'
        break
      default:
        sortField = 'name'
    }

    const sortedProducts = await productSchema
      .find()
      .populate({
        path: 'category_name',
        options: { sort: { [sortField]: 1 } }, // Sort the populated category field
      })
      .sort({ [sortField]: 1 }).skip(skip)
      .limit(ITEMS_PER_PAGE);

    res.render('product', { product_data: sortedProducts,pagename ,currentPage: page,totalPages})
  } catch (error) {
    console.error(error)
    res.send({ message: error.message })
  }
}

/************** filter product **************/

exports.filterProduct = async (req, res) => {
  const pagename = 'Product';
  const page = parseInt(req.query.page) || 1;
  const ITEMS_PER_PAGE = 10; // Define the number of items per page

  try {
    const {  minPrice, maxPrice } = req.query;

    let filteredProducts = productSchema.find().populate('category_name');

   
    if (minPrice && maxPrice) {
      filteredProducts = filteredProducts.where('price').gte(minPrice).lte(maxPrice);
    } else if (minPrice) {
      filteredProducts = filteredProducts.where('price').gte(minPrice);
    } else if (maxPrice) {
      filteredProducts = filteredProducts.where('price').lte(maxPrice);
    }

    const totalProducts = await productSchema.countDocuments();
    const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);
    const skip = (page - 1) * ITEMS_PER_PAGE;

    const product_data = await filteredProducts.skip(skip).limit(ITEMS_PER_PAGE).exec();

    res.render('product', { product_data, pagename, currentPage: page, totalPages });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Internal server error' });
  }
};

/************** filter orders **************/

exports.filterOrder = async (req, res) => {
  const pagename='Order'
  const { minPrice, maxPrice } = req.query;
  const page = parseInt(req.query.page) || 1;
  const ITEMS_PER_PAGE = 10; // Define the number of items per page

  
  let filteredProducts = orderSchema.find().populate('user').populate('items.product');
  
  try {
    if (minPrice && maxPrice) {
      filteredProducts = filteredProducts.where('total').gte(minPrice).lte(maxPrice);
    } else if (minPrice) {
      filteredProducts = filteredProducts.where('total').gte(minPrice);
    } else if (maxPrice) {
      filteredProducts = filteredProducts.where('total').lte(maxPrice);
    }

    const totalProducts = await productSchema.countDocuments();
    const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);
    const skip = (page - 1) * ITEMS_PER_PAGE;
   
    const orders = await filteredProducts.skip(skip).limit(ITEMS_PER_PAGE).exec();

    res.render('order', { orders,pagename,currentPage: page, totalPages  });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Internal server error' });
  }
};


/************** coupon page **************/


exports.getCoupon =async (req,res) => {
  const pagename='Coupon'
  const coupon=await CouponSchema.find()
  res.render('coupon',{coupon,pagename})
}

/************** add coupon page **************/

exports.addCouponPage = (req,res) => {
  const pagename='Add Coupon'
  res.render('add_coupon',{pagename})
}

/************** adding coupon **************/


exports.addCoupon = async (req,res) => {
  try {
    const coupon = new CouponSchema({
      coupon_code: req.body.coupon,
      expiry_date: req.body.expiry,
      discount: req.body.discount,
      
      
    })
    await coupon.save()

    res.redirect('/coupon')
  } catch (err) {
    console.log(err)
    res.status(500).send({
      message:
        err.message || 'Some error occurred while creating a create operation',
    })
  }
}


/************** inactivate coupon **************/

exports.inactivateCoupon = (req, res) => {
  const { id } = req.params
  

CouponSchema
    .findByIdAndUpdate(
      id,
      {
        status: "inactive"
      },
      { new: true }
    )
    .then((updatedUser) => {
      res.redirect('/coupon')
    })
    .catch((error) => {
      console.error(error)
      res.status(500).send('Failed to update user.')
    })
}


/************** activate coupon **************/

exports.activateCoupon = (req, res) => {
  const { id } = req.params

  CouponSchema
    .findByIdAndUpdate(
      id,
      {
        status: "active",
      },
      { new: true }
    )
    .then((updatedUser) => {
      res.redirect('/coupon')
    })
    .catch((error) => {
      console.error(error)
      res.status(500).send('Failed to update user.')
    })
}




/************** offer page **************/


exports.getOffer =async (req,res) => {
  const pagename='Offers'
  const offer=await Offerschema.find().populate('category')
  res.render('category_offer',{offer,pagename})
}

/************** add offer page **************/

exports.addOfferPage =async (req,res) => {
  const pagename='Add Offers'
  const category = await categorySchema.find()
  res.render('add_offer',{pagename,category})
}

/************** adding offer **************/


exports.addOffer = async (req,res) => {
  try {
    const offer = new Offerschema({
      category: req.body.category,
      expiry_date: req.body.expiry,
      amount: req.body.amount,
      
      
    })
    await offer.save()

    res.redirect('/offer')
  } catch (err) {
    console.log(err)
    res.status(500).send({
      message:
        err.message || 'Some error occurred while creating a create operation',
    })
  }
}


/************** inactivate offer **************/

exports.inactivateOffer = (req, res) => {
  const { id } = req.params
  

Offerschema
    .findByIdAndUpdate(
      id,
      {
        status: "inactive"
      },
      { new: true }
    )
    .then((updatedUser) => {
      res.redirect('/offer')
    })
    .catch((error) => {
      console.error(error)
      res.status(500).send('Failed to update user.')
    })
}


/************** activate offer **************/

exports.activateOffer = (req, res) => {
  const { id } = req.params

  Offerschema
    .findByIdAndUpdate(
      id,
      {
        status: "active",
      },
      { new: true }
    )
    .then((updatedUser) => {
      res.redirect('/offer')
    })
    .catch((error) => {
      console.error(error)
      res.status(500).send('Failed to update user.')
    })
}



/************** banner page **************/

exports.getbanner= async (req,res)=>{
  const pagename='Banner'
const banner=await bannerSchema.find()
  res.render('banner',{banner,pagename})
}


/************** add banner page **************/

exports.addBannerPage = (req,res)=>{
  const pagename='Add Banner'
  res.render('add_banner',{pagename})
}

/************** adding banner **************/

exports.addBannerImage=async (req,res)=>{
  const banner=new bannerSchema({
    banner_image: req.files.map((file) => file.filename)
    
  })
  await banner.save()
  res.redirect('/banner')
}

/************** edit banner page **************/

exports.editBannerPage = async (req, res) => {
  const pagename='Edit Banner'
  try {
    const { id } = req.params
    
    const banner = await bannerSchema.findById(id)
    
    
    if (!banner) {
      return res.redirect('/banner')
    }

    return res.render('update_banner', { banner,pagename })
  } catch (err) {
    console.error(err)
    return res.redirect('/banner')
  }
}

/************** editing banner **************/

exports.updateBanner = async (req, res) => {
 

  try {
    const { id } = req.params
    

    // Update the product using findByIdAndUpdate
    const updatedbanner = await bannerSchema.findByIdAndUpdate(
      id,
      {
       isDeleted:req.body.isDeleted,
       banner_image: req.files.map((file) => file.filename)
        
      },
      { upsert: true }
    )

      
    if (updatedbanner) {
      res.redirect('/banner')
    } else {
      res.redirect('/banner')
    }
  } catch (error) {
    console.error(error)
    res.send(error)
  }
}

/************** unlist banner **************/

exports.unlistBanner = (req, res) => {
  const { id } = req.params

  bannerSchema
    .findByIdAndUpdate(
      id,
      {
        isDeleted: true
      },
      { new: true }
    )
    .then((updatedUser) => {
      res.redirect('/banner')
    })
    .catch((error) => {
      console.error(error)
      res.status(500).send('Failed to update banner.')
    })
}

/************** list banner **************/


exports.listBanner = (req, res) => {
  const { id } = req.params

  bannerSchema
    .findByIdAndUpdate(
      id,
      {
        isDeleted: false,
      },
      { new: true }
    )
    .then((updatedUser) => {
      res.redirect('/banner')
    })
    .catch((error) => {
      console.error(error)
      res.status(500).send('Failed to update banner.')
    })
}




/************** logout **************/

exports.logout = (req, res) => {
  req.session.isAuth = false

  res.render('admin_signin')
}
