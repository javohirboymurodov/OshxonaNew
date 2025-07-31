const { User, Order } = require('../../models');
const Helpers = require('../../utils/helpers');
const { myOrdersKeyboard, backToMyOrdersKeyboard } = require('../../keyboards/userKeyboards');
const { Markup } = require('telegraf');

const PAGE_SIZE = 8;

async function showMyOrders(ctx) {
  try {
    const page = 1;
    const user = ctx.session.user || await User.findOne({ telegramId: ctx.from.id });
    const orders = await Order.find({ user: user._id }).sort({ createdAt: -1 });
    if (!orders.length) {
      return await ctx.reply('Sizda hali buyurtmalar yo\'q.');
    }
    ctx.session.myOrders = orders.map(o => o._id.toString());
    ctx.session.myOrdersPage = page;
    const keyboard = myOrdersKeyboard(orders, page, PAGE_SIZE);
    await ctx.reply('Buyurtmalaringiz:', { reply_markup: keyboard.reply_markup });
  } catch (error) {
    console.error('Show my orders error:', error);
    await ctx.reply('❌ Buyurtmalarni ko\'rsatishda xatolik!');
  }
}

async function myOrdersCallbackHandler(ctx) {
  const data = ctx.callbackQuery.data;
  if (data.startsWith('orders_page_')) {
    const page = parseInt(data.split('_').pop());
    ctx.session.myOrdersPage = page;
    const user = ctx.session.user || await User.findOne({ telegramId: ctx.from.id });
    const orders = await Order.find({ user: user._id }).sort({ createdAt: -1 });
    ctx.session.myOrders = orders.map(o => o._id.toString());
    await ctx.editMessageReplyMarkup(myOrdersKeyboard(orders, page, PAGE_SIZE).reply_markup);
    await ctx.answerCbQuery();
  } else if (data.startsWith('order_detail_')) {
    const orderId = data.split('_').pop();
    const order = await Order.findById(orderId);
    if (!order) return ctx.answerCbQuery('Buyurtma topilmadi!');
    let msg = `📋 <b>Buyurtma №:</b> ${order.orderId}\n`;
    msg += `📅 <b>Sana:</b> ${Helpers.formatDate(order.createdAt)}\n`;
    msg += `📦 <b>Status:</b> ${Helpers.getOrderStatusText(order.status, 'uz')}\n`;
    msg += `💰 <b>Jami:</b> ${Helpers.formatPrice(order.total)}\n`;
    msg += `📝 <b>Mahsulotlar:</b>\n`;
    order.items.forEach((item, idx) => {
      msg += `${idx + 1}. ${item.productName} x${item.quantity} = ${Helpers.formatPrice(item.totalPrice)}\n`;
    });
    await ctx.replyWithHTML(msg, backToMyOrdersKeyboard());
    await ctx.answerCbQuery();
  } else if (data === 'back_to_my_orders') {
    const page = ctx.session.myOrdersPage || 1;
    const user = ctx.session.user || await User.findOne({ telegramId: ctx.from.id });
    const orders = await Order.find({ user: user._id }).sort({ createdAt: -1 });
    ctx.session.myOrders = orders.map(o => o._id.toString());
    await ctx.reply('Buyurtmalaringiz:', myOrdersKeyboard(orders, page, PAGE_SIZE));
    await ctx.answerCbQuery();
  }
}

module.exports = { showMyOrders, myOrdersCallbackHandler };
