// Product management handlers - admin side
const { Product, Category } = require('../../models');
const AdminKeyboards = require('../../keyboards/adminKeyboards');
const mongoose = require('mongoose');  // ObjectId uchun
// const sharp = require('sharp'); // Temporarily disabled
const fs = require('fs').promises;
const path = require('path');

class ProductHandlers {
  // Mahsulotlar boshqaruvi asosiy menyu
  static async showProductManagement(ctx) {
    return this.productManagementHandler(ctx);
  }

  static async productManagementHandler(ctx) {
    try {
      if (!this.isAdmin(ctx)) {
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }
      
      const stats = await this.getProductStats();
      
      const message = `
🍽️ **Mahsulotlar boshqaruvi**

📊 **Statistika:**
• Jami mahsulotlar: ${stats.totalProducts}
• Faol mahsulotlar: ${stats.activeProducts}
• Nofaol mahsulotlar: ${stats.inactiveProducts}
• Kategoriyalar: ${stats.totalCategories}

💰 **Narxlar:**
• Eng arzon: ${stats.minPrice.toLocaleString()} so'm
• Eng qimmat: ${stats.maxPrice.toLocaleString()} so'm
• O'rtacha: ${stats.avgPrice.toLocaleString()} so'm
      `;
      
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: AdminKeyboards.productManagement().reply_markup
      });
      
    } catch (error) {
      console.error('Product management error:', error);
      await ctx.answerCbQuery('Mahsulotlar boshqaruvida xatolik!');
    }
  }

  // Mahsulot qo'shish
  static async createProduct(ctx) {
    try {
      if (!this.isAdmin(ctx)) {
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }
      
      const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1 });
      console.log('=== createProduct - Categories found ===');
      categories.forEach(cat => {
        console.log('Category ID:', cat._id.toString(), 'Name:', cat.name);
      });
      
      if (categories.length === 0) {
        return await ctx.editMessageText(
          '❌ Avval kategoriya yarating!',
          {
            reply_markup: AdminKeyboards.backToAdmin().reply_markup
          }
        );
      }
      
      let message = '📂 **Kategoriya tanlang:**\n\n';
      const buttons = [];
      
      categories.forEach(category => {
        message += `${category.emoji} ${category.name}\n`;
        buttons.push([{
          text: `${category.emoji} ${category.name}`,
          callback_data: `product_category_${category._id}`
        }]);
      });
      
      buttons.push([{
        text: '🔙 Orqaga',
        callback_data: 'admin_products'
      }]);
      
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
      });
      
    } catch (error) {
      console.error('Add product error:', error);
      await ctx.answerCbQuery('Mahsulot qo\'shishda xatolik!');
    }
  }

  // Kategoriya tanlagandan keyin mahsulot ma'lumotlarini so'rash
  static async selectProductCategory(ctx) {
    console.log('=== selectProductCategory CALLED ===');
    console.log('Callback data:', ctx.callbackQuery?.data);
    console.log('User ID:', ctx.from?.id);
    
    try {
      const categoryId = ctx.callbackQuery.data.split('_')[2]; // product_category_ID
      console.log('Category selection - Full callback data:', ctx.callbackQuery.data);
      console.log('Category selection - Parsed ID:', categoryId);
      
      // ObjectId validation va cast
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        console.log('Invalid ObjectId:', categoryId);
        return await ctx.answerCbQuery('Noto\'g\'ri kategoriya ID!');
      }
      
      const category = await Category.findById(new mongoose.Types.ObjectId(categoryId));
      console.log('Database query result:', category);
      
      if (!category) {
        console.log('Category not found with ID:', categoryId);
        return await ctx.answerCbQuery('Kategoriya topilmadi!');
      }
      
      // Session ga kategoriyani saqlash
      ctx.session.newProduct = { categoryId };
      ctx.session.adminAction = 'add_product_name';
      
      await ctx.editMessageText(
        `📝 **Yangi mahsulot qo'shish**\n\n📂 Kategoriya: ${category.emoji} ${category.name}\n\n💬 Mahsulot nomini kiriting:`,
        {
          parse_mode: 'Markdown',
          reply_markup: AdminKeyboards.backToAdmin().reply_markup
        }
      );
      
    } catch (error) {
      console.error('Select product category error:', error);
      await ctx.answerCbQuery('Kategoriyani tanlashda xatolik!');
    }
  }

  // Text message handling
  static async handleTextMessage(ctx) {
    try {
      const action = ctx.session.adminAction;
      const text = ctx.message.text?.trim();

      console.log('=== ProductHandlers.handleTextMessage ===');
      console.log('Admin action:', action);
      console.log('Text:', text);

      if (!text) {
        return await ctx.reply('❌ Bo\'sh matn yuborildi!');
      }

      // Mahsulot qo'shish
      if (action === 'add_product_name') {
        return this.handleProductInput(ctx, 'add_product_name', text);
      } 
      else if (action === 'add_product_description') {
        return this.handleProductInput(ctx, 'add_product_description', text);
      } 
      else if (action === 'add_product_price') {
        return this.handleProductInput(ctx, 'add_product_price', text);
      }
      
      // MAHSULOT TAHRIRLASH - PATTERN MATCHING BILAN:
      else if (action && action.startsWith('change_product_name_')) {
        console.log('Handling product name change');
        return this.handleProductUpdate(ctx, 'name', text);
      } 
      else if (action && action.startsWith('change_product_desc_')) {
        console.log('Handling product description change');
        return this.handleProductUpdate(ctx, 'description', text);
      } 
      else if (action && action.startsWith('change_product_price_')) {
        console.log('Handling product price change');
        const price = parseInt(text);
        if (isNaN(price) || price <= 0) {
          return await ctx.reply('❌ Narx noto\'g\'ri! Faqat musbat raqam kiriting.');
        }
        return this.handleProductUpdate(ctx, 'price', price);
      }

      console.log('No matching action found for:', action);
      await ctx.reply('❌ Noto\'g\'ri buyruq!');
      
    } catch (error) {
      console.error('Product text message error:', error);
      await ctx.reply('❌ Xatolik yuz berdi!');
    }
  }

  // YANGI METOD - QO'SHING:
  static async handleProductUpdate(ctx, field, value) {
    try {
      console.log('=== handleProductUpdate ===');
      console.log('Field:', field);
      console.log('Value:', value);
      
      const action = ctx.session.adminAction;
      const productId = action.split('_').pop(); // Oxirgi ID ni olish
      
      console.log('Product ID:', productId);
      
      const { Product } = require('../../models');
      const product = await Product.findById(productId);
      
      if (!product) {
        return await ctx.reply('❌ Mahsulot topilmadi!');
      }

      // Fieldni yangilash
      product[field] = value;
      await product.save();
      
      console.log('Product updated successfully');

      // Session ni tozalash
      ctx.session.adminAction = null;

      let fieldName = '';
      let displayValue = value;
      
      switch(field) {
        case 'name': fieldName = 'nom'; break;
        case 'description': fieldName = 'tavsif'; break; 
        case 'price': fieldName = 'narx'; displayValue = `${value.toLocaleString()} so'm`; break;
      }

      await ctx.reply(
        `✅ **Mahsulot ${fieldName}i muvaffaqiyatli o'zgartirildi!**\n\n📝 **Yangi ${fieldName}:** ${displayValue}`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '✏️ Davom etish', callback_data: `edit_product_${productId}` }],
              [{ text: '📋 Mahsulotlar', callback_data: 'admin_products' }]
            ]
          }
        }
      );

    } catch (error) {
      console.error('Handle product update error:', error);
      await ctx.reply('❌ Mahsulotni yangilashda xatolik!');
    }
  }

  // Mahsulot ma'lumotlarini qabul qilish va saqlash
  static async handleProductInput(ctx, inputType, value) {
    try {
      if (!ctx.session.newProduct) {
        ctx.session.newProduct = {};
      }
      
      switch (inputType) {
        case 'add_product_name':
          if (value.length < 2) {
            return await ctx.reply('❌ Mahsulot nomi kamida 2 ta belgidan iborat bo\'lishi kerak!');
          }
          
          ctx.session.newProduct.name = value;
          ctx.session.adminAction = 'add_product_description';
          
          console.log('=== Product name saved, moving to description ===');
          console.log('Session after name:', ctx.session.newProduct);
          console.log('Next action:', ctx.session.adminAction);
          
          await ctx.reply(
            '📋 **Mahsulot tavsifi**\n\nMahsulot haqida qisqacha ma\'lumot kiriting:',
            {
              parse_mode: 'Markdown',
              reply_markup: AdminKeyboards.backToAdmin().reply_markup
            }
          );
          break;
          
        case 'add_product_description':
          ctx.session.newProduct.description = value;
          ctx.session.adminAction = 'add_product_price';
          
          console.log('=== Product description saved, moving to price ===');
          console.log('Session after description:', ctx.session.newProduct);
          console.log('Next action:', ctx.session.adminAction);
          
          await ctx.reply(
            '💰 **Mahsulot narxi**\n\nMahsulot narxini kiriting (faqat raqam):',
            {
              parse_mode: 'Markdown',
              reply_markup: AdminKeyboards.backToAdmin().reply_markup
            }
          );
          break;
          
        case 'add_product_price':
          const price = parseInt(value);
          if (isNaN(price) || price <= 0) {
            return await ctx.reply('❌ Narx noto\'g\'ri! Faqat musbat raqam kiriting.');
          }
          
          ctx.session.newProduct.price = price;
          ctx.session.adminAction = 'add_product_image';
          
          console.log('=== Product price saved, moving to image ===');
          console.log('Session after price:', ctx.session.newProduct);
          console.log('Next action:', ctx.session.adminAction);
          
          await ctx.reply(
            '📸 **Mahsulot rasmi**\n\nMahsulot rasmini yuboring:',
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '⏭️ Rasmni o\'tkazib yuborish', callback_data: 'skip_product_image' }],
                  [{ text: '🔙 Orqaga', callback_data: 'admin_products' }]
                ]
              }
            }
          );
          break;
      }
      
    } catch (error) {
      console.error('Handle product input error:', error);
      await ctx.reply('Mahsulot ma\'lumotlarini saqlashda xatolik!');
    }
  }

  // Mahsulot rasmini qayta ishlash va saqlash
  static async handleProductImage(ctx) {
    try {
      if (!ctx.session.newProduct || ctx.session.adminAction !== 'add_product_image') {
        return;
      }
      
      if (!ctx.message.photo) {
        return await ctx.reply('❌ Iltimos, rasm yuboring!');
      }
      
      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      
      // Telegram file ID ni saqlash (rasmni telegram serverida saqlash)
      const fileId = photo.file_id;
      ctx.session.newProduct.imageFileId = fileId;
      
      // Rasmni processing qilish (optional - local copy uchun)
      // For now, we'll just store the fileId and skip the image processing
      try {
        console.log('Image uploaded successfully, fileId:', fileId);
        // Image processing disabled for now to avoid errors
      } catch (imageError) {
        console.error('Image processing error:', imageError);
        // Agar image processing fail bo'lsa, faqat fileId ni saqlaymiz
      }
      
      // Mahsulotni saqlash
      await this.saveProduct(ctx);
      
    } catch (error) {
      console.error('Handle product image error:', error);
      await ctx.reply('Rasm yuklashda xatolik yuz berdi!');
    }
  }

  // Rasmni o'tkazib yuborish
  static async skipProductImage(ctx) {
    try {
      if (!ctx.session.newProduct) {
        return await ctx.answerCbQuery('Xatolik yuz berdi!');
      }
      
      await this.saveProduct(ctx);
      
    } catch (error) {
      console.error('Skip product image error:', error);
      await ctx.answerCbQuery('Xatolik yuz berdi!');
    }
  }

  // Mahsulotni ma'lumotlar bazasiga saqlash
  static async saveProduct(ctx) {
    try {
      const productData = ctx.session.newProduct;
      
      console.log('=== saveProduct DEBUG ===');
      console.log('Product data:', productData);
      
      if (!productData.name || !productData.price || !productData.categoryId) {
        console.log('Missing required fields:',{
          name: !!productData.name,
          price: !!productData.price,
          categoryId: !!productData.categoryId
        });
        return await ctx.reply('❌ Mahsulot ma\'lumotlari to\'liq emas!');
      }
      
      const category = await Category.findById(productData.categoryId);
      if (!category) {
        return await ctx.reply('❌ Kategoriya topilmadi!');
      }
      
      // Sortni hisoblash
      const lastProduct = await Product.findOne({ categoryId: productData.categoryId })
        .sort({ sortOrder: -1 });
      const nextSortOrder = lastProduct ? lastProduct.sortOrder + 1 : 1;
      
      const newProduct = new Product({
        name: productData.name,
        description: productData.description || '',
        price: productData.price,
        categoryId: productData.categoryId,
        imageFileId: productData.imageFileId,
        imagePath: productData.imagePath,
        sortOrder: nextSortOrder,
        isActive: true,
        isAvailable: true,
        createdAt: new Date()
      });
      
      await newProduct.save();
      
      // Session ni tozalash
      ctx.session.newProduct = null;
      ctx.session.adminAction = null;
      
      let message = `✅ **Mahsulot muvaffaqiyatli qo'shildi!**\n\n`;
      message += `📂 Kategoriya: ${category.emoji} ${category.name}\n`;
      message += `📝 Nom: ${newProduct.name}\n`;
      message += `📋 Tavsif: ${newProduct.description || 'Yo\'q'}\n`;
      message += `💰 Narx: ${newProduct.price.toLocaleString()} so'm\n`;
      message += `📸 Rasm: ${newProduct.imageFileId ? 'Bor' : 'Yo\'q'}`;
      
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '➕ Yana qo\'shish', callback_data: 'product_add' },
              { text: '📋 Mahsulotlar', callback_data: 'admin_products' }
            ]
          ]
        }
      });
      
    } catch (error) {
      console.error('Save product error:', error);
      await ctx.reply('Mahsulotni saqlashda xatolik yuz berdi!');
    }
  }

  // Mahsulotni tahrirlash
  static async editProduct(ctx) {
  try {
    if (!this.isAdmin(ctx)) {
      return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
    }

    const productId = ctx.callbackQuery.data.split('_')[2];
    const product = await Product.findById(productId).populate('categoryId');

    if (!product) {
      return await ctx.answerCbQuery('Mahsulot topilmadi!');
    }

    const message = `✏️ **Mahsulotni tahrirlash**

📝 **Nom:** ${product.name}
📋 **Tavsif:** ${product.description || 'Yo\'q'}
💰 **Narx:** ${product.price.toLocaleString()} so'm
📂 **Kategoriya:** ${product.categoryId?.emoji || ''} ${product.categoryId?.name || 'Kategoriya yo\'q'}
📸 **Rasm:** ${product.imageFileId ? 'Bor' : 'Yo\'q'}
🔄 **Holat:** ${product.isActive ? '✅ Faol' : '❌ Nofaol'}

Nima o'zgartirmoqchisiz?`;

    // TUGMALAR - RASM O'ZGARTIRISH QO'SHILDI:
    const keyboard = [
      [
        { text: '📝 Nomini o\'zgartirish', callback_data: `change_product_name_${productId}` },
        { text: '📋 Tavsifini o\'zgartirish', callback_data: `change_product_desc_${productId}` }
      ],
      [
        { text: '💰 Narxini o\'zgartirish', callback_data: `change_product_price_${productId}` },
        { text: '📂 Kategoriyasini o\'zgartirish', callback_data: `change_product_category_${productId}` }
      ],
      [
        { text: '📸 Rasmini o\'zgartirish', callback_data: `change_product_image_${productId}` },
        { text: '🔄 Holatini o\'zgartirish', callback_data: `toggle_product_status_${productId}` }
      ],
      [
        { text: '🔙 Ortga', callback_data: 'product_edit' }
      ]
    ];

    // RASM BILAN BIRGA YUBORISH:
    if (product.imageFileId) {
      // Agar rasm bor bo'lsa - rasm bilan birga
      await ctx.deleteMessage().catch(() => {}); // Eski xabarni o'chirish
      
      await ctx.replyWithPhoto(product.imageFileId, {
        caption: message,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
    } else {
      // Agar rasm yo'q bo'lsa - oddiy xabar
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
    }

  } catch (error) {
    console.error('Edit product error:', error);
    await ctx.answerCbQuery('Mahsulotni tahrirlashda xatolik!');
  }
}

  // Mahsulotni o'chirish
  static async deleteProduct(ctx) {
    try {
      if (!this.isAdmin(ctx)) {
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }

      const productId = ctx.callbackQuery.data.split('_')[2];
      const product = await Product.findById(productId);

      if (!product) {
        return await ctx.answerCbQuery('Mahsulot topilmadi!');
      }

      const message = `
❌ **Mahsulotni o'chirish**

**Mahsulot:** ${product.name}
**Narx:** ${product.price.toLocaleString()} so'm

⚠️ **Diqqat!** Bu amalni bekor qilib bo'lmaydi!

Rostdan ham bu mahsulotni o'chirmoqchimisiz?
      `;

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Ha, o\'chirish', callback_data: `confirm_delete_product_${productId}` },
              { text: '❌ Yo\'q, bekor qilish', callback_data: 'admin_products' }
            ]
          ]
        }
      });

    } catch (error) {
      console.error('Delete product error:', error);
      await ctx.answerCbQuery('Mahsulotni o\'chirishda xatolik!');
    }
  }

  // Mahsulotni o'chirishni tasdiqlash
  static async confirmDeleteProduct(ctx) {
    try {
      if (!this.isAdmin(ctx)) {
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }

      const productId = ctx.callbackQuery.data.split('_')[3];
      const product = await Product.findById(productId);

      if (!product) {
        return await ctx.answerCbQuery('Mahsulot topilmadi!');
      }

      // Hard delete - butunlay o'chirish
      await Product.findByIdAndDelete(productId);

      await ctx.answerCbQuery('✅ Mahsulot butunlay o\'chirildi!');
      return this.showProductManagement(ctx);

    } catch (error) {
      console.error('Confirm delete product error:', error);
      await ctx.answerCbQuery('Mahsulotni o\'chirishni tasdiqlashda xatolik!');
    }
  }

  // Barcha mahsulotlarni ko'rsatish
  static async showAllProducts(ctx) {
    try {
      if (!this.isAdmin(ctx)) {
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }

      const products = await Product.find()
        .populate('categoryId', 'name emoji')
        .sort({ createdAt: -1 })
        .limit(20); // Faqat 20 ta mahsulot

      if (products.length === 0) {
        return await ctx.editMessageText(
          '❌ Hech qanday mahsulot topilmadi!',
          {
            reply_markup: AdminKeyboards.backToAdmin().reply_markup
          }
        );
      }

      let message = '📦 **Barcha mahsulotlar:**\n\n';
      const buttons = [];

      products.forEach((product, index) => {
        const status = product.isActive ? '✅' : '❌';
        const category = product.categoryId ? `${product.categoryId.emoji} ${product.categoryId.name}` : 'No category';
        message += `${index + 1}. ${status} **${product.name}**\n`;
        message += `   📂 ${category}\n`;
        message += `   💰 ${product.price.toLocaleString()} so'm\n`;
        message += `   📸 ${product.imageFileId ? 'Rasmi bor' : 'Rasmsiz'}\n\n`;

        buttons.push([{
          text: `✏️ ${product.name}`,
          callback_data: `product_edit_${product._id}`
        }]);
      });

      // Tugmalar qatorini 2 tadan qilish
      const chunkedButtons = [];
      for (let i = 0; i < buttons.length; i += 2) {
        if (i + 1 < buttons.length) {
          chunkedButtons.push([buttons[i][0], buttons[i + 1][0]]);
        } else {
          chunkedButtons.push([buttons[i][0]]);
        }
      }

      chunkedButtons.push([{
        text: '🔙 Orqaga',
        callback_data: 'admin_products'
      }]);

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: chunkedButtons }
      });

    } catch (error) {
      console.error('Show all products error:', error);
      await ctx.answerCbQuery('Mahsulotlarni ko\'rsatishda xatolik!');
    }
  }

  // Helper methods
  static async getProductStats() {
    try {
      const [totalProducts, activeProducts, totalCategories, prices] = await Promise.all([
        Product.countDocuments(),
        Product.countDocuments({ isActive: true }),
        Category.countDocuments({ isActive: true }),
        Product.aggregate([
          { $match: { isActive: true } },
          { 
            $group: { 
              _id: null, 
              minPrice: { $min: '$price' },
              maxPrice: { $max: '$price' },
              avgPrice: { $avg: '$price' }
            } 
          }
        ])
      ]);
      
      const priceStats = prices[0] || { minPrice: 0, maxPrice: 0, avgPrice: 0 };
      
      return {
        totalProducts,
        activeProducts,
        inactiveProducts: totalProducts - activeProducts,
        totalCategories,
        minPrice: priceStats.minPrice,
        maxPrice: priceStats.maxPrice,
        avgPrice: Math.round(priceStats.avgPrice)
      };
    } catch (error) {
      console.error('Get product stats error:', error);
      return {
        totalProducts: 0,
        activeProducts: 0,
        inactiveProducts: 0,
        totalCategories: 0,
        minPrice: 0,
        maxPrice: 0,
        avgPrice: 0
      };
    }
  }

  static isAdmin(ctx) {
    const adminIds = process.env.ADMIN_ID ? 
      process.env.ADMIN_ID.split(',').map(id => parseInt(id.toString().trim())) : 
      [];
    return adminIds.includes(ctx.from.id);
  }

  // YO'Q BO'LGAN 4 TA METOD - QO'SHING:

  // Mahsulot tahrirlash tanlovi
  static async editProductSelection(ctx) {
    try {
      console.log('=== ProductHandlers.editProductSelection called ===');
      
      const { Product, Category } = require('../../models');
      
      const products = await Product.find({ isActive: true })
        .populate('categoryId', 'name emoji')
        .sort({ createdAt: -1 })
        .limit(20);

      if (products.length === 0) {
        return await ctx.editMessageText('📦 Hech qanday mahsulot topilmadi!', {
          reply_markup: {
            inline_keyboard: [[{ text: '🔙 Ortga', callback_data: 'admin_products' }]]
          }
        });
      }

      let message = '✏️ **Tahrirlash uchun mahsulot tanlang:**\n\n';
      const keyboard = [];

      products.forEach((product, index) => {
        message += `${index + 1}. ${product.name} - ${product.price.toLocaleString()} so'm\n`;
        keyboard.push([{
          text: `✏️ ${product.name}`,
          callback_data: `edit_product_${product._id}`
        }]);
      });

      keyboard.push([{ text: '🔙 Ortga', callback_data: 'admin_products' }]);

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });

    } catch (error) {
      console.error('Edit product selection error:', error);
      await ctx.answerCbQuery('Xatolik yuz berdi!');
    }
  }

  // Kategoriya bo'yicha mahsulotlar
  static async showProductsByCategory(ctx) {
    try {
      console.log('=== ProductHandlers.showProductsByCategory called ===');
      
      const { Category, Product } = require('../../models');
      
      const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1 });

      if (categories.length === 0) {
        return await ctx.editMessageText('📂 Kategoriyalar mavjud emas!', {
          reply_markup: {
            inline_keyboard: [[{ text: '🔙 Ortga', callback_data: 'admin_products' }]]
          }
        });
      }

      let message = '📂 **Kategoriya tanlang:**\n\n';
      const keyboard = [];

      for (const category of categories) {
        const productCount = await Product.countDocuments({ 
          categoryId: category._id, 
          isActive: true 
        });
        
        message += `${category.emoji || '📁'} ${category.name} (${productCount} ta)\n`;
        keyboard.push([{
          text: `${category.emoji || '📁'} ${category.name} (${productCount})`,
          callback_data: `admin_category_products_${category._id}`
        }]);
      }

      keyboard.push([{ text: '🔙 Ortga', callback_data: 'admin_products' }]);

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });

    } catch (error) {
      console.error('Show products by category error:', error);
      await ctx.answerCbQuery('Xatolik yuz berdi!');
    }
  }

  // Mahsulot o'chirish tanlovi
  static async deleteProductSelection(ctx) {
    try {
      console.log('=== ProductHandlers.deleteProductSelection called ===');
      
      const { Product, Category } = require('../../models');
      
      const products = await Product.find({ isActive: true })
        .populate('categoryId', 'name emoji')
        .sort({ createdAt: -1 })
        .limit(20);

      if (products.length === 0) {
        return await ctx.editMessageText('📦 Hech qanday mahsulot topilmadi!', {
          reply_markup: {
            inline_keyboard: [[{ text: '🔙 Ortga', callback_data: 'admin_products' }]]
          }
        });
      }

      let message = '🗑️ **O\'chirish uchun mahsulot tanlang:**\n\n';
      const keyboard = [];

      products.forEach((product, index) => {
        message += `${index + 1}. ${product.name} - ${product.price.toLocaleString()} so'm\n`;
        keyboard.push([{
          text: `🗑️ ${product.name}`,
          callback_data: `delete_product_${product._id}`
        }]);
      });

      keyboard.push([{ text: '🔙 Ortga', callback_data: 'admin_products' }]);

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });

    } catch (error) {
      console.error('Product delete selection error:', error);
      await ctx.answerCbQuery('Xatolik yuz berdi!');
    }
  }

  // Mahsulot holatini o'zgartirish
  static async toggleProductStatus(ctx) {
    try {
      console.log('=== ProductHandlers.toggleProductStatus called ===');
      
      const { Product, Category } = require('../../models');
      
      const products = await Product.find()
        .populate('categoryId', 'name emoji')
        .sort({ createdAt: -1 })
        .limit(20);

      if (products.length === 0) {
        return await ctx.editMessageText('📦 Hech qanday mahsulot topilmadi!', {
          reply_markup: {
            inline_keyboard: [[{ text: '🔙 Ortga', callback_data: 'admin_products' }]]
          }
        });
      }

      let message = '🔄 **Holatini o\'zgartirish uchun mahsulot tanlang:**\n\n';
      const keyboard = [];

      products.forEach((product, index) => {
        const status = product.isActive ? '✅ Faol' : '❌ Nofaol';
        const statusIcon = product.isActive ? '❌' : '✅';
        
        message += `${index + 1}. ${product.name} - ${status}\n`;
        keyboard.push([{
          text: `${statusIcon} ${product.name}`,
          callback_data: `toggle_product_${product._id}`
        }]);
      });

      keyboard.push([{ text: '🔙 Ortga', callback_data: 'admin_products' }]);

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });

    } catch (error) {
      console.error('Product toggle status error:', error);
      await ctx.answerCbQuery('Xatolik yuz berdi!');
    }
  }

  // Photo message handling - YANGI METOD
  static async handlePhotoMessage(ctx) {
    try {
      const action = ctx.session.adminAction;
      console.log('=== ProductHandlers.handlePhotoMessage ===');
      console.log('Admin action:', action);
      
      if (action && action.startsWith('change_product_image_')) {
        const productId = action.split('_').pop();
        const { Product } = require('../../models');
        
        const product = await Product.findById(productId);
        if (!product) {
          return await ctx.reply('❌ Mahsulot topilmadi!');
        }

        if (!ctx.message.photo) {
          return await ctx.reply('❌ Iltimos, rasm yuboring!');
        }

        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const fileId = photo.file_id;

        product.imageFileId = fileId;
        await product.save();

        // Session ni tozalash
        ctx.session.adminAction = null;

        await ctx.reply(
          `✅ **Mahsulot rasmi muvaffaqiyatli o'zgartirildi!**\n\n📝 **Mahsulot:** ${product.name}`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '✏️ Davom etish', callback_data: `edit_product_${productId}` }],
                [{ text: '📋 Mahsulotlar', callback_data: 'admin_products' }]
              ]
            }
          }
        );
      }
      
    } catch (error) {
      console.error('Product photo message error:', error);
      await ctx.reply('❌ Rasm yuklashda xatolik!');
    }
  }
}

module.exports = ProductHandlers;
