// Admin interface and actions
module.exports = function registerAdmin(bot) {
  const AdminHandlers = require('../handlers/admin');
  const DashboardHandlers = require('../handlers/admin/dashboardHandlers');
  const OrderHandlers = require('../handlers/admin/orderHandlers');
  const ProductHandlers = require('../handlers/admin/productHandlers');
  const CategoryHandlers = require('../handlers/admin/categoryHandlers');
  const UserAdminHandlers = require('../handlers/admin/userHandlers');
  const StatisticsHandlers = require('../handlers/admin/statisticsHandlers');

  // Admin entry
  bot.action('admin_panel', async (ctx) => { await DashboardHandlers.adminPanelHandler(ctx); });

  // Admin main sections
  bot.action('admin_orders', async (ctx) => { await OrderHandlers.orderManagementHandler(ctx); });
  bot.action('admin_products', async (ctx) => { await ProductHandlers.productManagementHandler(ctx); });
  bot.action('admin_categories', async (ctx) => { await CategoryHandlers.showCategoryManagement(ctx); });
  bot.action('admin_users', async (ctx) => { await UserAdminHandlers.userManagementHandler(ctx); });
  bot.action('admin_stats', async (ctx) => { await StatisticsHandlers.showStatistics(ctx); });

  // Orders section actions
  bot.action('orders_new', async (ctx) => { await OrderHandlers.showNewOrders(ctx); });
  bot.action('orders_preparing', async (ctx) => { await OrderHandlers.showPreparingOrders(ctx); });
  bot.action('orders_ready', async (ctx) => { await OrderHandlers.showReadyOrders(ctx); });
  bot.action('orders_delivering', async (ctx) => { await OrderHandlers.showDeliveringOrders(ctx); });
  bot.action('orders_all', async (ctx) => { await OrderHandlers.showAllOrders(ctx); });
  bot.action('orders_stats', async (ctx) => { await OrderHandlers.showOrdersStats(ctx); });
  bot.action(/^view_order_(.+)$/, async (ctx) => { await OrderHandlers.viewOrderDetails(ctx); });
  bot.action(/^confirm_order_(.+)$/, async (ctx) => { await OrderHandlers.confirmOrder(ctx); });
  bot.action(/^reject_order_(.+)$/, async (ctx) => { await OrderHandlers.rejectOrder(ctx); });
  bot.action(/^prepare_order_(.+)$/, async (ctx) => { await OrderHandlers.prepareOrder(ctx); });
  bot.action(/^ready_order_(.+)$/, async (ctx) => { await OrderHandlers.readyOrder(ctx); });
  bot.action(/^deliver_order_(.+)$/, async (ctx) => { await OrderHandlers.deliverOrder(ctx); });
  bot.action(/^complete_order_(.+)$/, async (ctx) => { await OrderHandlers.completeOrder(ctx); });

  // Products section actions
  bot.action('product_add', async (ctx) => { await ProductHandlers.createProduct(ctx); });
  bot.action(/^product_category_(.+)$/, async (ctx) => { await ProductHandlers.selectProductCategory(ctx); });
  bot.action('skip_product_image', async (ctx) => { await ProductHandlers.skipProductImage(ctx); });
  bot.action('product_edit', async (ctx) => { await ProductHandlers.editProductSelection(ctx); });
  bot.action(/^edit_product_(.+)$/, async (ctx) => { await ProductHandlers.editProduct(ctx); });
  bot.action('product_by_category', async (ctx) => { await ProductHandlers.showProductsByCategory(ctx); });
  bot.action(/^admin_category_products_(.+)$/, async (ctx) => { await ProductHandlers.showProductsByCategory(ctx); });
  bot.action('product_delete', async (ctx) => { await ProductHandlers.deleteProductSelection(ctx); });
  bot.action(/^delete_product_(.+)$/, async (ctx) => { await ProductHandlers.deleteProduct(ctx); });
  bot.action(/^confirm_delete_product_(.+)$/, async (ctx) => { await ProductHandlers.confirmDeleteProduct(ctx); });
  bot.action('products_all', async (ctx) => { await ProductHandlers.showAllProducts(ctx); });
  bot.action('product_toggle', async (ctx) => { await ProductHandlers.toggleProductStatus(ctx); });
  bot.action(/^toggle_product_(.+)$/, async (ctx) => { await ProductHandlers.toggleProductStatus(ctx); });

  // Categories section actions
  bot.action('category_add', async (ctx) => { await CategoryHandlers.createCategory(ctx); });
  bot.action('categories_all', async (ctx) => { await CategoryHandlers.showAllCategories(ctx); });
  bot.action('category_edit', async (ctx) => { await CategoryHandlers.editCategorySelection(ctx); });
  bot.action(/^edit_category_(.+)$/, async (ctx) => { await CategoryHandlers.editCategory(ctx); });
  bot.action('category_toggle', async (ctx) => { await CategoryHandlers.toggleCategoryStatus(ctx); });
  bot.action(/^toggle_status_(.+)$/, async (ctx) => { const id = ctx.callbackQuery.data.split('_').pop(); await CategoryHandlers.toggleCategoryStatusById(ctx, id); });
  bot.action('category_delete', async (ctx) => { await CategoryHandlers.deleteCategorySelection(ctx); });
  bot.action(/^delete_category_(.+)$/, async (ctx) => { await CategoryHandlers.deleteCategory(ctx); });
  bot.action(/^confirm_delete_category_(.+)$/, async (ctx) => { await CategoryHandlers.confirmDeleteCategory(ctx); });
  bot.action(/^use_suggested_order_(\d+)$/, async (ctx) => { await CategoryHandlers.useSuggestedOrder(ctx); });

  // Users section actions
  bot.action('users_search', async (ctx) => { await UserAdminHandlers.searchUsers(ctx); });
  bot.action('users_active', async (ctx) => { await UserAdminHandlers.showActiveUsers(ctx); });
  bot.action(/^user_details_(.+)$/, async (ctx) => { await UserAdminHandlers.viewUserDetails(ctx); });
  bot.action(/^toggle_block_(.+)$/, async (ctx) => { await UserAdminHandlers.toggleUserBlock(ctx); });
  bot.action('users_broadcast', async (ctx) => { await UserAdminHandlers.showBroadcast(ctx); });

  // Statistics section actions
  bot.action('stats_today', async (ctx) => { await StatisticsHandlers.showTodayStats(ctx); });
  bot.action('stats_week', async (ctx) => { await StatisticsHandlers.showWeekStats(ctx); });
  bot.action('stats_month', async (ctx) => { await StatisticsHandlers.showMonthStats(ctx); });
  bot.action('stats_year', async (ctx) => { await StatisticsHandlers.showYearStats(ctx); });

  // Admin quick actions from Telegram notification (status update)
  bot.action(/^admin_quick_(confirmed|preparing|ready|delivered|cancelled)_(.+)$/, async (ctx) => {
    try {
      const adminIds = process.env.ADMIN_ID ? process.env.ADMIN_ID.split(',').map((id) => parseInt(id.trim())) : [];
      if (!adminIds.includes(ctx.from.id)) return await ctx.answerCbQuery('❌ Sizda admin huquqi yo\'q!');

      const status = ctx.match[1];
      const orderId = ctx.match[2];
      const { Order } = require('../models');
      const SocketManager = require('../config/socketConfig');

      const order = await Order.findById(orderId).populate('user', 'telegramId');
      if (!order) return await ctx.answerCbQuery('❌ Buyurtma topilmadi!');

      order.status = status === 'delivered' ? 'delivered' : status;
      order.updatedAt = new Date();
      order.statusHistory = order.statusHistory || [];
      order.statusHistory.push({ status: order.status, timestamp: new Date(), note: 'Admin quick action (Telegram)', updatedBy: 'admin' });
      await order.save();

      try {
        SocketManager.emitStatusUpdate(order.user?._id, { orderId: order._id, orderNumber: order.orderId, status: order.status, message: `Status: ${order.status}`, updatedAt: new Date() });
      } catch {}

      try {
        if (order.user?.telegramId) {
          const statusText = { confirmed: 'Buyurtmangiz tasdiqlandi', preparing: 'Buyurtmangiz tayyorlanmoqda', ready: 'Buyurtmangiz tayyor', delivered: 'Buyurtma yetkazildi', cancelled: 'Buyurtma bekor qilindi' }[order.status] || 'Status yangilandi';
          await ctx.telegram.sendMessage(order.user.telegramId, `📦 Buyurtma №${order.orderId}\n${statusText}`, { parse_mode: 'Markdown' });
        }
      } catch {}

      await ctx.answerCbQuery('✅ Yangilandi');
      try { await ctx.editMessageReplyMarkup({ inline_keyboard: [] }); } catch {}
    } catch (error) {
      await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });
};


