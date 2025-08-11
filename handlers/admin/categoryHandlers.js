const { Category, Product } = require('../../models');
const AdminKeyboards = require('../../keyboards/adminKeyboards');
// const sharp = require('sharp'); // Temporarily disabled
const path = require('path');
const fs = require('fs');

class CategoryHandlers {
  // Kategoriyalar boshqaruvi asosiy menyu
  static async showCategoryManagement(ctx) {
    try {
      if (!this.isAdmin(ctx)) {
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }

      const categories = await Category.find().sort({ sortOrder: 1, name: 1 });
      const totalProducts = await Product.countDocuments({ isActive: true });

      let message = `
📂 **Kategoriyalar Boshqaruvi**

📊 **Statistika:**
• Jami kategoriyalar: ${categories.length}
• Jami mahsulotlar: ${totalProducts}

📋 **Kategoriyalar ro'yxati:**
`;

      if (categories.length === 0) {
        message += '\n❌ Hech qanday kategoriya topilmadi';
      } else {
        for (let i = 0; i < categories.length; i++) {
          const category = categories[i];
          const productCount = await Product.countDocuments({ 
            categoryId: category._id, 
            isActive: true 
          });
          
          const status = category.isActive ? '' : '❌ ';
          message += `\n${i + 1}. ${status}${category.emoji || '📂'} **${category.name}**`;
          message += `\n   └ ${productCount} mahsulot`;
        }
      }

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: AdminKeyboards.categoryManagement(categories).reply_markup
      });

    } catch (error) {
      console.error('Category management error:', error);
      await ctx.answerCbQuery('Kategoriyalar boshqaruvida xatolik!');
    }
  }

  // Yangi kategoriya yaratish
  static async createCategory(ctx) {
    try {
      console.log('CreateCategory called by user:', ctx.from.id);
      console.log('Admin check result:', this.isAdmin(ctx));
      
      if (!this.isAdmin(ctx)) {
        console.log('User is not admin');
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }

      console.log('User is admin, proceeding...');
      console.log('Setting session data...');
      ctx.session.adminAction = 'category_create';
      ctx.session.categoryData = {};
      console.log('Session set, sending message...');

      await ctx.editMessageText(
        '📝 **Yangi kategoriya yaratish**\n\nKategoriya nomini emoji bilan kiriting:\n\n💡 **Misol:** 🍕 Pitsa, 🍔 Burger, 🥗 Salatlar\n\n📝 Agar emoji kiritmassangiz, standart 📂 ishlatiladi.',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔙 Ortga', callback_data: 'admin_categories' }]
            ]
          }
        }
      );
      
      console.log('Message sent successfully!');

    } catch (error) {
      console.error('Create category error:', error);
      await ctx.answerCbQuery('Kategoriya yaratishda xatolik!');
    }
  }

  // Kategoriya tahrirlash
  static async editCategory(ctx) {
    try {
      if (!this.isAdmin(ctx)) {
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }

      const categoryId = ctx.callbackQuery.data.split('_')[2];
      const category = await Category.findById(categoryId);

      if (!category) {
        return await ctx.answerCbQuery('Kategoriya topilmadi!');
      }

      ctx.session.adminAction = 'category_edit';
      ctx.session.categoryData = {
        id: categoryId,
        currentCategory: category
      };

      const message = `✏️ **Kategoriya tahrirlash**

**Joriy ma'lumotlar:**
• Nom: ${category.emoji || '📂'} ${category.name}
• Tartib: ${category.sortOrder || 0}
• Holat: ${category.isActive ? '✅ Faol' : '❌ Nofaol'}

**Yangi kategoriya nomini kiriting:**
(Emoji bilan birga kiriting, masalan: 🍕 Pitsa)`;

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Ortga', callback_data: 'admin_categories' }]
          ]
        }
      });

    } catch (error) {
      console.error('Edit category error:', error);
      await ctx.answerCbQuery('Kategoriya tahrirlashda xatolik!');
    }
  }

  // Kategoriya o'chirish
  static async deleteCategory(ctx) {
    try {
      if (!this.isAdmin(ctx)) {
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }

      const categoryId = ctx.callbackQuery.data.split('_')[2];
      const category = await Category.findById(categoryId);

      if (!category) {
        return await ctx.answerCbQuery('Kategoriya topilmadi!');
      }

      // Kategoriyada mahsulotlar borligini tekshirish
      const productCount = await Product.countDocuments({ 
        categoryId: categoryId, 
        isActive: true 
      });

      if (productCount > 0) {
        return await ctx.answerCbQuery(`❌ Bu kategoriyada ${productCount} ta mahsulot bor! Avval mahsulotlarni boshqa kategoriyaga o'tkazing yoki o'chiring.`);
      }

      const message = `
❌ **Kategoriya o'chirish**

**Kategoriya:** ${category.name}
**Emoji:** ${category.emoji || 'Yo\'q'}

⚠️ **Diqqat!** Bu amalni bekor qilib bo'lmaydi!

Rostdan ham bu kategoriyani o'chirmoqchimisiz?
      `;

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Ha, o\'chirish', callback_data: `confirm_delete_category_${categoryId}` },
              { text: '❌ Yo\'q, bekor qilish', callback_data: 'admin_categories' }
            ]
          ]
        }
      });

    } catch (error) {
      console.error('Delete category error:', error);
      await ctx.answerCbQuery('Kategoriya o\'chirishda xatolik!');
    }
  }

  // Kategoriya o'chirishni tasdiqlash
  static async confirmDeleteCategory(ctx) {
    try {
      if (!this.isAdmin(ctx)) {
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }

      const categoryId = ctx.callbackQuery.data.split('_')[3];
      const category = await Category.findById(categoryId);

      if (!category) {
        return await ctx.answerCbQuery('Kategoriya topilmadi!');
      }

      // Hard delete - butunlay o'chirish
      await Category.findByIdAndDelete(categoryId);

      await ctx.answerCbQuery('✅ Kategoriya butunlay o\'chirildi!');
      return this.showCategoryManagement(ctx);

    } catch (error) {
      console.error('Confirm delete category error:', error);
      await ctx.answerCbQuery('Kategoriya o\'chirishni tasdiqlashda xatolik!');
    }
  }

  // Text message handling
  static async handleTextMessage(ctx) {
    try {
      const action = ctx.session.adminAction;
      const text = ctx.message.text?.trim();

      if (!text) {
        return await ctx.reply('❌ Bo\'sh matn yuborildi!');
      }

      if (action === 'category_create') {
        return this.handleCreateCategoryStep(ctx, text);
      } else if (action === 'category_edit') {
        return this.handleEditCategoryStep(ctx, text);
      }

      await ctx.reply('❌ Noto\'g\'ri buyruq!');
    } catch (error) {
      console.error('Category text message error:', error);
      await ctx.reply('❌ Xatolik yuz berdi!');
    }
  }

  // Kategoriya yaratish bosqichlari
  static async handleCreateCategoryStep(ctx, text) {
    const categoryData = ctx.session.categoryData;

    if (!categoryData.name) {
      // Birinchi bosqich: Nom va emoji birga
      // Emoji bor-yo'qligini tekshirish
      const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
      const emojis = text.match(emojiRegex);
      
      if (emojis && emojis.length > 0) {
        // Emoji mavjud - uni ajratib olamiz
        categoryData.emoji = emojis[0]; // Birinchi emojini olamiz
        categoryData.name = text.replace(emojiRegex, '').trim(); // Emojini olib tashlab, nomni olamiz
      } else {
        // Emoji yo'q - default emoji ishlatamiz
        categoryData.emoji = '📂';
        categoryData.name = text.trim();
      }
      
      // Tartib raqamini so'raymiz
      await this.askCategorySortOrder(ctx);
      
    } else if (categoryData.sortOrder === undefined) {
      // Ikkinchi bosqich: Tartib raqami
      const sortOrder = parseInt(text);
      if (isNaN(sortOrder) || sortOrder < 0) {
        return await ctx.reply('❌ Tartib raqami musbat son bo\'lishi kerak!');
      }
      
      categoryData.sortOrder = sortOrder;
      await this.createCategoryFinal(ctx);
    }
  }

  // Kategoriya tahrirlash bosqichlari
  static async handleEditCategoryStep(ctx, text) {
    const categoryData = ctx.session.categoryData;
    const category = await Category.findById(categoryData.id);

    if (!category) {
      await ctx.reply('❌ Kategoriya topilmadi!');
      return;
    }

    // Emoji bor-yo'qligini tekshirish
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    const emojis = text.match(emojiRegex);
    
    if (emojis && emojis.length > 0) {
      // Emoji mavjud - uni ajratib olamiz
      category.emoji = emojis[0]; // Birinchi emojini olamiz
      category.name = text.replace(emojiRegex, '').trim(); // Emojini olib tashlab, nomni olamiz
    } else {
      // Emoji yo'q - faqat nomni o'zgartiramiz, eski emojini saqlaymiz
      category.name = text.trim();
    }

    await category.save();

    ctx.session.adminAction = null;
    ctx.session.categoryData = null;

    // Success message bilan yangi kategoriyalar ro'yxatini yuborish
    await ctx.reply(`✅ Kategoriya "${category.emoji || '📂'} ${category.name}" ga o'zgartirildi!`);
    
    // Kategoriyalar boshqaruvi sahifasini qayta yuborish
    const categories = await Category.find().sort({ sortOrder: 1, name: 1 });
    const totalProducts = await Product.countDocuments({ isActive: true });

    let message = `📂 **Kategoriyalar Boshqaruvi**

📊 **Statistika:**
• Jami kategoriyalar: ${categories.length}
• Jami mahsulotlar: ${totalProducts}

📋 **Kategoriyalar ro'yxati:**
`;

    if (categories.length === 0) {
      message += '\n❌ Hech qanday kategoriya topilmadi';
    } else {
      for (let i = 0; i < categories.length; i++) {
        const cat = categories[i];
        const productCount = await Product.countDocuments({ 
          categoryId: cat._id, 
          isActive: true 
        });
        
        const status = cat.isActive ? '' : '❌ ';
        message += `\n${i + 1}. ${status}${cat.emoji || '📂'} **${cat.name}**`;
        message += `\n   └ ${productCount} mahsulot`;
      }
    }

    const AdminKeyboards = require('../../keyboards/adminKeyboards');
    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: AdminKeyboards.categoryManagement(categories).reply_markup
    });
  }

  // Tavsiya etilgan tartibni ishlatish
  static async useSuggestedOrder(ctx) {
    const order = parseInt(ctx.callbackQuery.data.split('_')[3]);
    ctx.session.categoryData.sortOrder = order;
    await this.createCategoryFinal(ctx);
  }

  // Tartib raqamini so'rash
  static async askCategorySortOrder(ctx) {
    const lastCategory = await Category.findOne().sort({ sortOrder: -1 });
    const suggestedOrder = (lastCategory?.sortOrder || 0) + 1;

    await ctx.reply(
      `📊 **Tartib raqamini kiriting**\n\nBu kategoriya qaysi o'rinda turishi kerak?\n\n💡 Tavsiya: ${suggestedOrder}`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: `✅ ${suggestedOrder} ishlatish`, callback_data: `use_suggested_order_${suggestedOrder}` }],
            [{ text: '🔙 Ortga', callback_data: 'admin_categories' }]
          ]
        }
      }
    );
  }

  // Tavsiya etilgan tartibni ishlatish
  static async useSuggestedOrder(ctx) {
    const order = parseInt(ctx.callbackQuery.data.split('_')[3]);
    ctx.session.categoryData.sortOrder = order;
    await this.createCategoryFinal(ctx);
  }

  // Kategoriyani yakuniy yaratish
  static async createCategoryFinal(ctx) {
    try {
      const categoryData = ctx.session.categoryData;

      const category = new Category({
        name: categoryData.name,
        emoji: categoryData.emoji || '📂',
        sortOrder: categoryData.sortOrder || 0,
        isActive: true
      });

      await category.save();

      ctx.session.adminAction = null;
      ctx.session.categoryData = null;

      await ctx.reply(`✅ **Kategoriya muvaffaqiyatli yaratildi!**\n\n📂 ${category.emoji} ${category.name}`, {
        parse_mode: 'Markdown'
      });

      return this.showCategoryManagement(ctx);

    } catch (error) {
      console.error('Create category final error:', error);
      await ctx.reply('❌ Kategoriya yaratishda xatolik yuz berdi!');
    }
  }

  // Helper metodlar
  static isValidEmoji(text) {
    // Simple emoji validation
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
    return text.length <= 4 && emojiRegex.test(text);
  }

  // Barcha kategoriyalarni ko'rsatish
  static async showAllCategories(ctx) {
    try {
      if (!this.isAdmin(ctx)) {
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }

      const categories = await Category.find().sort({ sortOrder: 1, name: 1 });

      if (categories.length === 0) {
        await ctx.editMessageText('❌ Hech qanday kategoriya topilmadi!', {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔙 Ortga', callback_data: 'admin_categories' }]
            ]
          }
        });
        return;
      }

      let message = '📋 **Barcha kategoriyalar ro\'yxati:**\n\n';

      for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        const productCount = await Product.countDocuments({ 
          categoryId: category._id, 
          isActive: true 
        });
        
        const status = category.isActive ? '✅' : '❌';
        message += `${i + 1}. ${status} ${category.emoji || '📂'} **${category.name}**\n`;
        message += `   └ ${productCount} mahsulot | Tartib: ${category.sortOrder || 0}\n\n`;
      }

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Ortga', callback_data: 'admin_categories' }]
          ]
        }
      });

    } catch (error) {
      console.error('Show all categories error:', error);
      await ctx.answerCbQuery('Kategoriyalarni ko\'rsatishda xatolik!');
    }
  }

  // Kategoriya tahrirlash tanlash
  static async editCategorySelection(ctx) {
    try {
      if (!this.isAdmin(ctx)) {
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }

      const categories = await Category.find().sort({ sortOrder: 1, name: 1 });

      if (categories.length === 0) {
        await ctx.answerCbQuery('❌ Kategoriya topilmadi!');
        return;
      }

      let message = '✏️ **Tahrirlash uchun kategoriya tanlang:**\n\n';
      const buttons = [];

      categories.forEach((category, index) => {
        const status = category.isActive ? '' : '❌ ';
        message += `${index + 1}. ${status}${category.emoji || '📂'} ${category.name}\n`;
        buttons.push([{ 
          text: `${status}${category.emoji || '📂'} ${category.name}`, 
          callback_data: `edit_category_${category._id}` 
        }]);
      });

      buttons.push([{ text: '🔙 Ortga', callback_data: 'admin_categories' }]);

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
      });

    } catch (error) {
      console.error('Edit category selection error:', error);
      await ctx.answerCbQuery('Kategoriya tanlashda xatolik!');
    }
  }

  // Kategoriya holati o'zgartirish
  static async toggleCategoryStatus(ctx) {
    try {
      if (!this.isAdmin(ctx)) {
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }

      const categories = await Category.find().sort({ name: 1 });

      if (categories.length === 0) {
        await ctx.answerCbQuery('❌ Kategoriya topilmadi!');
        return;
      }

      let message = '🔄 **Holatini o\'zgartirish uchun kategoriya tanlang:**\n\n';
      const buttons = [];

      categories.forEach((category, index) => {
        const status = category.isActive ? '✅ Faol' : '❌ Nofaol';
        message += `${index + 1}. ${status} ${category.emoji || '📂'} ${category.name}\n`;
        buttons.push([{ 
          text: `${category.emoji || '📂'} ${category.name} (${status})`, 
          callback_data: `toggle_status_${category._id}` 
        }]);
      });

      buttons.push([{ text: '🔙 Ortga', callback_data: 'admin_categories' }]);

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
      });

    } catch (error) {
      console.error('Toggle category status error:', error);
      await ctx.answerCbQuery('Holati o\'zgartirishda xatolik!');
    }
  }

  // Kategoriya statistikasi
  static async showCategoryStats(ctx) {
    try {
      if (!this.isAdmin(ctx)) {
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }

      const categories = await Category.find().sort({ sortOrder: 1 });
      const totalProducts = await Product.countDocuments({ isActive: true });

      let message = '📊 **Kategoriyalar statistikasi:**\n\n';
      message += `📈 **Umumiy ko\'rsatkichlar:**\n`;
      message += `• Jami kategoriyalar: ${categories.length}\n`;
      message += `• Jami mahsulotlar: ${totalProducts}\n\n`;

      if (categories.length > 0) {
        message += '📋 **Kategoriyalar bo\'yicha:**\n';
        
        for (const category of categories) {
          const productCount = await Product.countDocuments({ 
            categoryId: category._id, 
            isActive: true 
          });
          
          const percentage = totalProducts > 0 ? ((productCount / totalProducts) * 100).toFixed(1) : 0;
          message += `${category.emoji || '📂'} **${category.name}**: ${productCount} ta (${percentage}%)\n`;
        }
      }

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Ortga', callback_data: 'admin_categories' }]
          ]
        }
      });

    } catch (error) {
      console.error('Category stats error:', error);
      await ctx.answerCbQuery('Statistika ko\'rsatishda xatolik!');
    }
  }

  // Kategoriya o'chirish tanlash
  static async deleteCategorySelection(ctx) {
    try {
      if (!this.isAdmin(ctx)) {
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }

      const categories = await Category.find().sort({ name: 1 });

      if (categories.length === 0) {
        await ctx.answerCbQuery('❌ O\'chirish uchun kategoriya topilmadi!');
        return;
      }

      let message = '🗑️ **O\'chirish uchun kategoriya tanlang:**\n\n';
      message += '⚠️ **Diqqat:** Faqat bo\'sh kategoriyalarni o\'chirish mumkin!\n\n';
      
      const buttons = [];

      for (const category of categories) {
        const productCount = await Product.countDocuments({ 
          categoryId: category._id, 
          isActive: true 
        });
        
        const canDelete = productCount === 0;
        const statusText = canDelete ? '✅ Bo\'sh' : `❌ ${productCount} mahsulot`;
        const categoryStatus = category.isActive ? '' : '❌ ';
        
        message += `${categoryStatus}${category.emoji || '📂'} **${category.name}** - ${statusText}\n`;
        
        if (canDelete) {
          buttons.push([{ 
            text: `🗑️ ${categoryStatus}${category.emoji || '📂'} ${category.name}`, 
            callback_data: `delete_category_${category._id}` 
          }]);
        }
      }

      buttons.push([{ text: '🔙 Ortga', callback_data: 'admin_categories' }]);

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
      });

    } catch (error) {
      console.error('Delete category selection error:', error);
      await ctx.answerCbQuery('Kategoriya o\'chirish tanlovida xatolik!');
    }
  }

  // Kategoriya holatini ID bo'yicha o'zgartirish
  static async toggleCategoryStatusById(ctx, categoryId) {
    try {
      if (!this.isAdmin(ctx)) {
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }

      const category = await Category.findById(categoryId);
      if (!category) {
        return await ctx.answerCbQuery('❌ Kategoriya topilmadi!');
      }

      category.isActive = !category.isActive;
      await category.save();

      const status = category.isActive ? 'faollashtirildi' : 'nofaol qilindi';
      await ctx.answerCbQuery(`✅ ${category.name} ${status}!`);
      
      return this.showCategoryManagement(ctx);

    } catch (error) {
      console.error('Toggle category status by ID error:', error);
      await ctx.answerCbQuery('Holati o\'zgartirishda xatolik!');
    }
  }

  static isAdmin(ctx) {
    console.log('Checking admin status for user:', ctx.from.id);
    console.log('ADMIN_ID from env:', process.env.ADMIN_ID);
    
    const adminIds = process.env.ADMIN_ID ? 
      process.env.ADMIN_ID.split(',').map(id => parseInt(id.toString().trim())) : 
      [];
      
    console.log('Parsed admin IDs:', adminIds);
    console.log('User ID type:', typeof ctx.from.id);
    console.log('Is admin?', adminIds.includes(ctx.from.id));
    
    return adminIds.includes(ctx.from.id);
  }
}

module.exports = CategoryHandlers;
