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
      [ { text: '✅ Ishni boshlash', callback_data: 'courier_start_work' }, { text: '🛑 Ishni tugatish', callback_data: 'courier_stop_work' } ],
      [ { text: info.isOnline ? '🔴 Offline' : '🟢 Online', callback_data: 'courier_shift_toggle' } ],
      [ { text: info.isAvailable ? '❌ Band qilish' : '✅ Mavjud qilish', callback_data: 'courier_available_toggle' } ],
      [ { text: '📍 Joylashuvni yuborish', callback_data: 'courier_send_location' } ],
      [ { text: '📋 Faol buyurtmalar', callback_data: 'courier_active_orders' } ],
      [ { text: '👤 Profil', callback_data: 'courier_profile' }, { text: '💰 Daromad', callback_data: 'courier_earnings' } ],
      [ { text: '🔙 Asosiy menyu', callback_data: 'courier_back' } ],
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


