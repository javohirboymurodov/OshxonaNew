function buildMainText(user) {
  const info = (user && user.courierInfo) || {};
  const fullName = `${(user && user.firstName) || 'Courier'} ${user && user.lastName ? user.lastName : ''}`.trim();
  const online = info.isOnline ? '🟢 Online' : '🔴 Offline';
  const available = info.isAvailable ? '✅ Mavjud' : '❌ Band';
  const rating = info.rating != null ? `${Number(info.rating).toFixed(1)} ⭐` : '—';
  const total = info.totalDeliveries || 0;
  return (
    '🚚 Haydovchi paneli' +
    '\n\n' +
    `👋 Salom, ${fullName}!` +
    '\n\n' +
    `Holat: ${online}` + '\n' +
    `Mavjudlik: ${available}` + '\n' +
    `Reyting: ${rating}` + '\n' +
    `Jami yetkazmalar: ${total}`
  );
}

function mainMenuKeyboard(user) {
  const info = (user && user.courierInfo) || {};
  return {
    inline_keyboard: [
      // 🔧 FIX: Faqat ishni boshlash/tugatish - joylashuvni yuborish tugmasi keraksiz
      [ { text: info.isOnline ? '🛑 Ishni tugatish' : '✅ Ishni boshlash', callback_data: info.isOnline ? 'courier_stop_work' : 'courier_start_work' } ],
      [ { text: info.isAvailable ? '❌ Band qilish' : '✅ Mavjud qilish', callback_data: 'courier_available_toggle' } ],
      [ { text: '📋 Buyurtmalar', callback_data: 'courier_all_orders' } ],
      [ { text: '👤 Profil', callback_data: 'courier_profile' }, { text: '💰 Daromad', callback_data: 'courier_earnings' } ],
      [ { text: '🔙 Kuryer paneli', callback_data: 'courier_main_menu' } ],
    ]
  };
}

function replyKeyboard() {
  return {
    keyboard: [
      [ { text: '📍 Joylashuvni yuborish', request_location: true } ],
      [ { text: '⬅️ Kuryer menyusi' } ],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

function replyKeyboardMain() {
  return {
    keyboard: [
      [ { text: '⬅️ Kuryer menyusi' } ],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

module.exports = { buildMainText, mainMenuKeyboard, replyKeyboard, replyKeyboardMain };


