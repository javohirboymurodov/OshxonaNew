// Yangi va Innovatsion Funksiyalar
class NewFeatures {
  // AI-powered recommendation system
  static async getAIRecommendations(userId, context = 'general') {
    const user = await User.findById(userId).populate('orderHistory');
    const userOrders = await Order.find({ user: userId, status: 'completed' })
      .populate('items.product');

    // User preferences ni analyze qilish
    const preferences = this.analyzeUserPreferences(userOrders);
    
    let recommendations = [];

    switch (context) {
      case 'weather':
        recommendations = await this.getWeatherBasedRecommendations(preferences);
        break;
      case 'time':
        recommendations = await this.getTimeBasedRecommendations(preferences);
        break;
      case 'collaborative':
        recommendations = await this.getCollaborativeRecommendations(userId);
        break;
      default:
        recommendations = await this.getGeneralRecommendations(preferences);
    }

    return recommendations;
  }

  static analyzeUserPreferences(orders) {
    const preferences = {
      categories: {},
      priceRange: { min: Infinity, max: 0 },
      orderTimes: [],
      spicyLevel: 0,
      dietaryRestrictions: []
    };

    orders.forEach(order => {
      order.items.forEach(item => {
        const product = item.product;
        
        // Category preferences
        if (product.categoryId) {
          preferences.categories[product.categoryId] = 
            (preferences.categories[product.categoryId] || 0) + 1;
        }

        // Price range
        preferences.priceRange.min = Math.min(preferences.priceRange.min, item.price);
        preferences.priceRange.max = Math.max(preferences.priceRange.max, item.price);
      });

      // Order time patterns
      preferences.orderTimes.push(order.createdAt.getHours());
    });

    return preferences;
  }

  // Voice ordering support
  static async processVoiceOrder(audioBuffer, userId) {
    try {
      // Voice to text conversion (mock implementation)
      const transcript = await this.convertSpeechToText(audioBuffer);
      
      // NLP processing
      const orderIntent = await this.parseOrderIntent(transcript);
      
      if (orderIntent.confidence > 0.7) {
        return {
          success: true,
          transcript,
          products: orderIntent.products,
          message: `Men sizning buyurtmangizni tushundim: ${transcript}`
        };
      } else {
        return {
          success: false,
          message: 'Kechirasiz, buyurtmangizni aniq tushunmadim. Qaytadan aytib ko\'ring.'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Ovozni qayta ishlashda xatolik yuz berdi.'
      };
    }
  }

  static async convertSpeechToText(audioBuffer) {
    // Google Speech-to-Text yoki boshqa servis integration
    // Mock implementation
    return "Men ikkita osh va bitta somsa buyurtma qilmoqchiman";
  }

  static async parseOrderIntent(text) {
    // NLP processing with intent recognition
    const products = [];
    const words = text.toLowerCase().split(' ');
    
    // Simple keyword matching (real implementation would use ML)
    const productKeywords = {
      'osh': { id: 'product_id_1', name: 'Osh', confidence: 0.9 },
      'somsa': { id: 'product_id_2', name: 'Somsa', confidence: 0.8 },
      'manti': { id: 'product_id_3', name: 'Manti', confidence: 0.85 }
    };

    // Quantity extraction
    const numbers = {
      'bir': 1, 'bitta': 1, 'ikki': 2, 'ikkita': 2, 'uch': 3, 'uchta': 3,
      'tort': 4, 'tortta': 4, 'besh': 5, 'beshta': 5
    };

    words.forEach((word, index) => {
      if (productKeywords[word]) {
        let quantity = 1;
        
        // Check for quantity before the product
        if (index > 0 && numbers[words[index - 1]]) {
          quantity = numbers[words[index - 1]];
        }

        products.push({
          ...productKeywords[word],
          quantity
        });
      }
    });

    return {
      products,
      confidence: products.length > 0 ? 0.8 : 0.3
    };
  }

  // Group ordering system
  static async createGroupOrder(creatorId, restaurantId, deadline) {
    const groupOrder = new GroupOrder({
      creator: creatorId,
      restaurant: restaurantId,
      deadline: deadline,
      status: 'active',
      participants: [creatorId],
      shareCode: this.generateShareCode()
    });

    await groupOrder.save();

    return {
      success: true,
      groupOrder,
      shareLink: `https://t.me/${process.env.BOT_USERNAME}?start=group_${groupOrder.shareCode}`
    };
  }

  static async joinGroupOrder(userId, shareCode) {
    const groupOrder = await GroupOrder.findOne({ 
      shareCode, 
      status: 'active',
      deadline: { $gt: new Date() }
    });

    if (!groupOrder) {
      return { success: false, message: 'Guruh buyurtmasi topilmadi yoki muddati tugagan' };
    }

    if (!groupOrder.participants.includes(userId)) {
      groupOrder.participants.push(userId);
      await groupOrder.save();
    }

    return { success: true, groupOrder };
  }

  static generateShareCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  // Smart nutrition tracking
  static async calculateNutritionInfo(items) {
    const nutrition = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0
    };

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (product && product.nutritionInfo) {
        nutrition.calories += (product.nutritionInfo.calories || 0) * item.quantity;
        nutrition.protein += (product.nutritionInfo.protein || 0) * item.quantity;
        nutrition.carbs += (product.nutritionInfo.carbs || 0) * item.quantity;
        nutrition.fat += (product.nutritionInfo.fat || 0) * item.quantity;
        nutrition.fiber += (product.nutritionInfo.fiber || 0) * item.quantity;
        nutrition.sugar += (product.nutritionInfo.sugar || 0) * item.quantity;
        nutrition.sodium += (product.nutritionInfo.sodium || 0) * item.quantity;
      }
    }

    return nutrition;
  }

  static async getDietaryRecommendations(userId, dietType) {
    const filters = {
      vegetarian: { 'tags': { $in: ['vegetarian'] } },
      vegan: { 'tags': { $in: ['vegan'] } },
      halal: { 'tags': { $in: ['halal'] } },
      gluten_free: { 'tags': { $in: ['gluten-free'] } },
      low_calorie: { 'nutritionInfo.calories': { $lt: 300 } },
      high_protein: { 'nutritionInfo.protein': { $gt: 20 } }
    };

    const filter = filters[dietType] || {};
    
    return await Product.find({
      ...filter,
      isActive: true,
      isAvailable: true
    }).limit(10);
  }

  // Gamification system
  static async updateUserBadges(userId, action, data = {}) {
    const user = await User.findById(userId);
    const badges = user.gamification?.badges || [];
    
    const badgeRules = {
      'first_order': {
        condition: () => action === 'order_completed' && user.stats.totalOrders === 1,
        name: 'Birinchi Buyurtma',
        description: 'Birinchi buyurtmangiz uchun!',
        icon: '🥇',
        points: 50
      },
      'loyal_customer': {
        condition: () => user.stats.totalOrders >= 10,
        name: 'Sodiq Mijoz',
        description: '10 ta buyurtma amalga oshirgansiz!',
        icon: '💎',
        points: 200
      },
      'big_spender': {
        condition: () => user.stats.totalSpent >= 100000,
        name: 'Katta Xaridor',
        description: '100,000 so\'m dan ko\'p xarid qildingiz!',
        icon: '💰',
        points: 300
      },
      'night_owl': {
        condition: () => action === 'order_completed' && new Date().getHours() >= 22,
        name: 'Tungi Buyurtmachi',
        description: 'Tungi soatlarda buyurtma berdingiz!',
        icon: '🦉',
        points: 100
      },
      'speed_demon': {
        condition: () => action === 'quick_order' && data.orderTime < 60, // 1 minute
        name: 'Tezkor Buyurtmachi',
        description: '1 daqiqada buyurtma berdingiz!',
        icon: '⚡',
        points: 75
      }
    };

    const newBadges = [];
    
    for (const [badgeId, rule] of Object.entries(badgeRules)) {
      if (!badges.find(b => b.id === badgeId) && rule.condition()) {
        newBadges.push({
          id: badgeId,
          name: rule.name,
          description: rule.description,
          icon: rule.icon,
          points: rule.points,
          earnedAt: new Date()
        });
        
        user.gamification = user.gamification || {};
        user.gamification.points = (user.gamification.points || 0) + rule.points;
      }
    }

    if (newBadges.length > 0) {
      user.gamification.badges = [...badges, ...newBadges];
      await user.save();
      
      return newBadges;
    }

    return [];
  }

  // Social features
  static async shareOrder(orderId, platform) {
    const order = await Order.findById(orderId).populate('items.product user');
    
    const shareText = `🍽️ ${order.user.firstName}ning buyurtmasi:\n\n${
      order.items.map(item => `• ${item.productName} x${item.quantity}`).join('\n')
    }\n\n💰 Jami: ${order.total.toLocaleString()} so'm\n\n📱 O'zingiz ham buyurtma bering: ${process.env.BOT_URL}`;

    const shareUrls = {
      telegram: `https://t.me/share/url?url=${encodeURIComponent(process.env.BOT_URL)}&text=${encodeURIComponent(shareText)}`,
      instagram: `https://www.instagram.com/`, // Stories API integration needed
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(process.env.BOT_URL)}&quote=${encodeURIComponent(shareText)}`
    };

    return shareUrls[platform] || shareUrls.telegram;
  }

  // Eco-friendly features
  static async calculateCarbonFootprint(orderId) {
    const order = await Order.findById(orderId).populate('items.product');
    
    let carbonFootprint = 0;
    
    order.items.forEach(item => {
      const product = item.product;
      // Mock carbon calculation (real implementation needs product carbon data)
      const baseCarbon = product.category === 'meat' ? 5.2 : 
                        product.category === 'vegetarian' ? 1.8 : 3.0;
      carbonFootprint += baseCarbon * item.quantity;
    });

    // Delivery carbon cost
    if (order.orderType === 'delivery') {
      carbonFootprint += 2.1; // kg CO2 for delivery
    }

    return {
      totalKgCO2: Math.round(carbonFootprint * 100) / 100,
      treeOffset: Math.ceil(carbonFootprint / 21.77), // trees needed to offset
      ecoScore: Math.max(10 - Math.floor(carbonFootprint), 1),
      recommendations: this.getEcoRecommendations(carbonFootprint)
    };
  }

  static getEcoRecommendations(footprint) {
    if (footprint > 10) {
      return [
        '🌱 Ko\'proq vegetarian taomlar tanlang',
        '🚶 Olib ketish variantini tanlang',
        '📦 Bir nechta buyurtmani birlashtirib bering'
      ];
    } else if (footprint > 5) {
      return [
        '♻️ Qayta ishlanadigan qadoqlarni tanlang',
        '🌿 Mahalliy mahsulotlarni afzal ko\'ring'
      ];
    } else {
      return [
        '🎉 Ajoyib! Sizning buyurtmangiz ekologik jihatdan qulay',
        '🌟 Boshqa mijozlarga ham namunadasiz!'
      ];
    }
  }
}

// Schema extensions for new features
const GroupOrderSchema = new mongoose.Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  individualCarts: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    items: [{
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      quantity: Number,
      price: Number
    }],
    total: Number
  }],
  deadline: { type: Date, required: true },
  status: { type: String, enum: ['active', 'ordering', 'completed', 'cancelled'], default: 'active' },
  shareCode: { type: String, unique: true },
  finalOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }
}, { timestamps: true });

module.exports = { NewFeatures, GroupOrderSchema };
