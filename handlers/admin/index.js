// Admin handlerlarini boshqaruvchi fayl
const orderHandlers = require('./orderHandlers');
const productHandlers = require('./productHandlers');
const categoryHandlers = require('./categoryHandlers');
const userHandlers = require('./userHandlers');
const statisticsHandlers = require('./statisticsHandlers');
const dashboardHandlers = require('./dashboardHandlers');

class AdminHandlers {
  // Dashboard va asosiy panel
  static async showAdminPanel(ctx) {
    return dashboardHandlers.showAdminPanel(ctx);
  }

  static async adminPanelHandler(ctx) {
    return dashboardHandlers.adminPanelHandler(ctx);
  }

  // Buyurtmalar boshqaruvi
  static async showOrderManagement(ctx) {
    return orderHandlers.showOrderManagement(ctx);
  }

  static async orderManagementHandler(ctx) {
    return orderHandlers.orderManagementHandler(ctx);
  }

  static async showNewOrders(ctx) {
    return orderHandlers.showNewOrders(ctx);
  }

  static async viewOrderDetails(ctx) {
    return orderHandlers.viewOrderDetails(ctx);
  }

  static async confirmOrder(ctx) {
    return orderHandlers.confirmOrder(ctx);
  }

  static async rejectOrder(ctx) {
    return orderHandlers.rejectOrder(ctx);
  }

  static async prepareOrder(ctx) {
    return orderHandlers.prepareOrder(ctx);
  }

  static async readyOrder(ctx) {
    return orderHandlers.readyOrder(ctx);
  }

  static async deliverOrder(ctx) {
    return orderHandlers.deliverOrder(ctx);
  }

  static async completeOrder(ctx) {
    return orderHandlers.completeOrder(ctx);
  }

  static async showPreparingOrders(ctx) {
    return orderHandlers.showPreparingOrders(ctx);
  }

  static async showReadyOrders(ctx) {
    return orderHandlers.showReadyOrders(ctx);
  }

  static async showDeliveringOrders(ctx) {
    return orderHandlers.showDeliveringOrders(ctx);
  }

  static async showAllOrders(ctx) {
    return orderHandlers.showAllOrders(ctx);
  }

  static async showOrdersStats(ctx) {
    return orderHandlers.showOrdersStats(ctx);
  }

  // Mahsulotlar boshqaruvi
  static async showProductManagement(ctx) {
    return productHandlers.showProductManagement(ctx);
  }

  static async productManagementHandler(ctx) {
    return productHandlers.productManagementHandler(ctx);
  }

  static async createProduct(ctx) {
    return productHandlers.createProduct(ctx);
  }

  static async selectProductCategory(ctx) {
    return productHandlers.selectProductCategory(ctx);
  }

  static async skipProductImage(ctx) {
    return productHandlers.skipProductImage(ctx);
  }

  static async editProduct(ctx) {
    return productHandlers.editProduct(ctx);
  }

  static async deleteProduct(ctx) {
    return productHandlers.deleteProduct(ctx);
  }

  static async confirmDeleteProduct(ctx) {
    return productHandlers.confirmDeleteProduct(ctx);
  }

  static async showAllProducts(ctx) {
    return productHandlers.showAllProducts(ctx);
  }

  static async uploadProductImage(ctx) {
    return productHandlers.uploadProductImage(ctx);
  }

  // YO'Q BO'LGAN 4 TA MAHSULOT METODI - QO'SHING:

  // Mahsulot tahrirlash tanlovi
  static async editProductSelection(ctx) {
    console.log('=== AdminHandlers.editProductSelection called ===');
    return productHandlers.editProductSelection(ctx);
  }

  // Kategoriya bo'yicha mahsulotlar
  static async showProductsByCategory(ctx) {
    console.log('=== AdminHandlers.showProductsByCategory called ===');
    return productHandlers.showProductsByCategory(ctx);
  }

  // Mahsulot o'chirish tanlovi
  static async deleteProductSelection(ctx) {
    console.log('=== AdminHandlers.deleteProductSelection called ===');
    return productHandlers.deleteProductSelection(ctx);
  }

  // Mahsulot holatini o'zgartirish
  static async toggleProductStatus(ctx) {
    console.log('=== AdminHandlers.toggleProductStatus called ===');
    return productHandlers.toggleProductStatus(ctx);
  }

  // Kategoriyalar boshqaruvi
  static async showCategoryManagement(ctx) {
    return categoryHandlers.showCategoryManagement(ctx);
  }

  static async createCategory(ctx) {
    console.log('AdminHandlers.createCategory called');
    return categoryHandlers.createCategory(ctx);
  }

  static async editCategory(ctx) {
    return categoryHandlers.editCategory(ctx);
  }

  static async deleteCategory(ctx) {
    return categoryHandlers.deleteCategory(ctx);
  }

  // Qo'shimcha kategoriya metodlari
  static async showAllCategories(ctx) {
    return categoryHandlers.showAllCategories(ctx);
  }

  static async editCategorySelection(ctx) {
    return categoryHandlers.editCategorySelection(ctx);
  }

  static async toggleCategoryStatus(ctx) {
    return categoryHandlers.toggleCategoryStatus(ctx);
  }

  static async showCategoryStats(ctx) {
    return categoryHandlers.showCategoryStats(ctx);
  }

  static async deleteCategorySelection(ctx) {
    return categoryHandlers.deleteCategorySelection(ctx);
  }

  // Qo'shimcha metodlar
  static async toggleCategoryStatusById(ctx, categoryId) {
    return categoryHandlers.toggleCategoryStatusById(ctx, categoryId);
  }

  static async confirmDeleteCategory(ctx) {
    return categoryHandlers.confirmDeleteCategory(ctx);
  }

  static async skipCategoryEmoji(ctx) {
    return categoryHandlers.skipCategoryEmoji(ctx);
  }

  static async useSuggestedOrder(ctx) {
    return categoryHandlers.useSuggestedOrder(ctx);
  }

  // Foydalanuvchilar boshqaruvi
  static async showUserManagement(ctx) {
    return userHandlers.showUserManagement(ctx);
  }

  static async viewUserDetails(ctx) {
    return userHandlers.viewUserDetails(ctx);
  }

  static async blockUser(ctx) {
    return userHandlers.blockUser(ctx);
  }

  // FOYDALANUVCHILAR BO'YICHA QO'SHIMCHA METODLAR:
  
  static async searchUsers(ctx) {
    return userHandlers.searchUsers(ctx);
  }

  static async showActiveUsers(ctx) {
    return userHandlers.showActiveUsers(ctx);
  }

  static async showBroadcast(ctx) {
    return userHandlers.showBroadcast(ctx);
  }

  static async toggleUserBlock(ctx) {
    return userHandlers.toggleUserBlock(ctx);
  }

  static async handleUserSearch(ctx, searchText) {
    return userHandlers.handleUserSearch(ctx, searchText);
  }

  static async sendBroadcast(ctx, message) {
    return userHandlers.sendBroadcast(ctx, message);
  }

  // Statistika
  static async statisticsHandler(ctx) {
    return statisticsHandlers.statisticsHandler(ctx);
  }

  static async todayStats(ctx) {
    return statisticsHandlers.todayStats(ctx);
  }

  static async generateTodayPDF(ctx) {
    return statisticsHandlers.generateTodayPDF(ctx);
  }

  // Text message handling
  static async handleTextMessage(ctx) {
    console.log('=== AdminHandlers.handleTextMessage ===');
    console.log('Session adminAction:', ctx.session.adminAction);
    
    // Session ga qarab to'g'ri handlerga yo'naltirish
    if (ctx.session.adminAction) {
      const action = ctx.session.adminAction;
      
      if (action.startsWith('add_product_') || 
          action.startsWith('edit_product_') || 
          action.startsWith('change_product_') ||
          action.startsWith('product_')) {
        console.log('Calling ProductHandlers.handleTextMessage');
        return productHandlers.handleTextMessage(ctx);
      } 
      else if (action.startsWith('category_') || action.startsWith('add_category_')) {
        console.log('Calling CategoryHandlers.handleTextMessage');
        return categoryHandlers.handleTextMessage(ctx);
      } 
      else if (action.startsWith('user_')) {
        console.log('Calling UserHandlers.handleTextMessage');
        return userHandlers.handleTextMessage(ctx);
      }
    }
    
    await ctx.reply('❌ Noto\'g\'ri buyruq!');
  }

  // Photo message handling
  static async handlePhotoMessage(ctx) {
    // Session ga qarab to'g'ri handlerga yo'naltirish
    if (ctx.session.adminAction) {
      const action = ctx.session.adminAction;
      
      if (action === 'add_product_image') {
        return productHandlers.handleProductImage(ctx);
      }
    }
    
    await ctx.reply('❌ Rasm yuklash rejimi yo\'q!');
  }

  // Helper methods
  static isAdmin(ctx) {
    const adminIds = process.env.ADMIN_ID ? 
      process.env.ADMIN_ID.split(',').map(id => parseInt(id.toString().trim())) : 
      [];
    return adminIds.includes(ctx.from.id);
  }
}

module.exports = AdminHandlers;
