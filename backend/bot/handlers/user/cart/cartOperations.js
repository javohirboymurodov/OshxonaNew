/**
 * Cart Operations
 * Savat operatsiyalari
 */

const { User, Product, Cart } = require('../../../../models');
const BranchProduct = require('../../../../models/BranchProduct');

/**
 * Foydalanuvchini topish
 */
async function findUserByTelegramId(telegramId) {
  return await User.findOne({ telegramId });
}

/**
 * Mahsulotni topish va mavjudligini tekshirish
 */
async function findAndValidateProduct(productId, userBranch) {
  const product = await Product.findById(productId);
  if (!product) {
    return { product: null, error: 'Mahsulot topilmadi!' };
  }

  // Filial-spetsifik mavjudlikni tekshirish
  if (userBranch) {
    const branchProduct = await BranchProduct.findOne({
      product: productId,
      branch: userBranch
    });
    
    if (!branchProduct || !branchProduct.isAvailable) {
      return { product, error: '❌ Mahsulot hozirda mavjud emas!' };
    }
  }

  return { product, error: null };
}

/**
 * Foydalanuvchi savatini topish yoki yaratish
 */
async function findOrCreateCart(userId) {
  let cart = await Cart.findOne({ user: userId, isActive: true });
  
  if (!cart) {
    cart = new Cart({
      user: userId,
      items: [],
      isActive: true
    });
    await cart.save();
  }
  
  return cart;
}

/**
 * Savatga mahsulot qo'shish
 */
async function addProductToCart(cart, product, quantity) {
  const existingItemIndex = cart.items.findIndex(
    item => String(item.product) === String(product._id)
  );

  if (existingItemIndex >= 0) {
    // Mavjud mahsulot miqdorini oshirish
    cart.items[existingItemIndex].quantity += quantity;
  } else {
    // Yangi mahsulot qo'shish
    cart.items.push({
      product: product._id,
      quantity: quantity,
      price: product.price,
      name: product.name
    });
  }

  await cart.save();
  return cart;
}

/**
 * Savatdan mahsulot o'chirish
 */
async function removeProductFromCart(cart, productId) {
  cart.items = cart.items.filter(
    item => String(item.product) !== String(productId)
  );
  
  await cart.save();
  return cart;
}

/**
 * Savat mahsulot miqdorini yangilash
 */
async function updateProductQuantity(cart, productId, newQuantity) {
  const item = cart.items.find(
    item => String(item.product) === String(productId)
  );
  
  if (item) {
    if (newQuantity <= 0) {
      return await removeProductFromCart(cart, productId);
    } else {
      item.quantity = newQuantity;
      await cart.save();
    }
  }
  
  return cart;
}

/**
 * Savat jami summasini hisoblash
 */
function calculateCartTotal(cart) {
  return cart.items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
}

/**
 * Savat ma'lumotlarini formatlash
 */
function formatCartMessage(cart, products = []) {
  let message = '🛒 **Savat**\n\n';
  
  if (cart.items.length === 0) {
    message += 'Savat bo\'sh 😔\n';
    message += 'Mahsulot qo\'shish uchun katalogga o\'ting';
    return message;
  }

  let total = 0;
  
  cart.items.forEach((item, index) => {
    const product = products.find(p => String(p._id) === String(item.product));
    const itemTotal = item.price * item.quantity;
    total += itemTotal;
    
    message += `${index + 1}. **${product?.name || item.name || 'Noma\'lum'}**\n`;
    message += `   💰 ${item.price.toLocaleString()} so'm x ${item.quantity} = ${itemTotal.toLocaleString()} so'm\n\n`;
  });
  
  message += `💰 **Jami: ${total.toLocaleString()} so'm**`;
  
  return message;
}

/**
 * Savatni tozalash
 */
async function clearCart(cart) {
  cart.items = [];
  cart.isActive = false;
  await cart.save();
  
  // Yangi savat yaratish
  const newCart = new Cart({
    user: cart.user,
    items: [],
    isActive: true
  });
  await newCart.save();
  
  return newCart;
}

module.exports = {
  findUserByTelegramId,
  findAndValidateProduct,
  findOrCreateCart,
  addProductToCart,
  removeProductFromCart,
  updateProductQuantity,
  calculateCartTotal,
  formatCartMessage,
  clearCart
};