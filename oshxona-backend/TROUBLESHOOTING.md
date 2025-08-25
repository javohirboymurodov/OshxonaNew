# 🔧 Telegram Bot Tugmalari Ishlamasa

## Muammo
/start dan keyingi bosh sahifadagi tugmalar (inline keyboard) bosilganda hech qanday javob bermayapti.

## Sabablari va Yechimlar

### 1. Callback Query Javob Berish
**Muammo**: Har bir callback query uchun `answerCbQuery()` chaqirilishi kerak, aks holda Telegram 5 soniya kutib qoladi.

**Yechim**: 
```javascript
bot.action('start_order', async (ctx) => {
  try {
    // Birinchi navbatda callback query ga javob berish
    await ctx.answerCbQuery();
    
    // Keyin asosiy logika
    await startOrderHandler(ctx);
  } catch (error) {
    console.error('Error:', error);
    try {
      await ctx.answerCbQuery('Xatolik yuz berdi!');
    } catch {}
  }
});
```

### 2. Session Middleware
**Muammo**: Session to'g'ri ishlamasligi callback handlerlarni buzishi mumkin.

**Yechim**:
```javascript
bot.use(session({
  defaultSession: () => ({
    step: 'idle',
    cart: [],
    orderData: {},
    // ... boshqa default qiymatlar
  })
}));
```

### 3. Error Handling
**Muammo**: Xatolar to'g'ri handle qilinmasa, bot javob bermaydi.

**Yechim**:
```javascript
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  if (ctx.answerCbQuery) {
    ctx.answerCbQuery('Xatolik yuz berdi!').catch(() => {});
  }
});
```

### 4. Duplicate Handlers
**Muammo**: Bir xil callback uchun bir nechta handler bo'lsa, birinchisi ishlaydi, qolganlari ishlamaydi.

**Yechim**: Callback handlerlarni tekshirish va duplicate larni olib tashlash.

### 5. Database Connection
**Muammo**: Database ulanmagan bo'lsa, handler ichidagi database so'rovlari ishlamaydi.

**Yechim**: Database connection ni tekshirish:
```javascript
const dbStatus = Database.getConnectionStatus();
if (!dbStatus.isConnected) {
  console.error('Database not connected!');
}
```

## Debug Qilish

### 1. Console Logs Qo'shish
```javascript
bot.on('callback_query', async (ctx) => {
  console.log('Callback received:', ctx.callbackQuery.data);
});
```

### 2. Test Script
```bash
node debug-callbacks.js
```

### 3. Environment Variables
```bash
# .env faylida:
BOT_TOKEN=your_bot_token_here
MONGODB_URI=mongodb://localhost:27017/oshxona
```

## Tez Yechim

Agar tugmalar ishlamasa:

1. **Bot ni qayta ishga tushiring**
   ```bash
   npm run dev
   ```

2. **Callback query log qo'shing**
   ```javascript
   bot.on('callback_query', (ctx) => {
     console.log('Button pressed:', ctx.callbackQuery.data);
   });
   ```

3. **Database ulanishini tekshiring**
   ```bash
   mongo
   > use oshxona
   > db.users.find().limit(1)
   ```

4. **Telegram Bot API xatolarini tekshiring**
   - Bot token to'g'riligini
   - Webhook sozlamalarini
   - Rate limit xatolarini

## Qo'shimcha Ma'lumot

Agar muammo davom etsa:
1. `bot/user/callbacks.js` faylida barcha action handler lar to'g'ri registratsiya qilinganini tekshiring
2. `bot/botManager.js` da `registerUserCallbacks(bot)` chaqirilganini tekshiring  
3. Console da xatolik xabarlarini tekshiring
4. Network tab da Telegram API ga so'rovlarni kuzating