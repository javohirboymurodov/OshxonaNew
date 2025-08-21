const axios = require('axios');
const crypto = require('crypto');

class PaymentService {
  // Click to'lov
  static async processClickPayment(orderId, amount, phone) {
    try {
      if (!process.env.CLICK_MERCHANT_ID || !process.env.CLICK_SECRET_KEY) {
        throw new Error('Click konfiguratsiyasi topilmadi');
      }
      
      const merchantId = process.env.CLICK_MERCHANT_ID;
      const secretKey = process.env.CLICK_SECRET_KEY;
      
      const params = {
        merchant_id: merchantId,
        amount: amount,
        transaction_param: orderId,
        return_url: `${process.env.BOT_URL}/payment/click/return`,
        merchant_trans_id: `${orderId}_${Date.now()}`
      };
      
      // Imzo yaratish
      const signString = `${params.merchant_id}${params.amount}${params.transaction_param}${params.return_url}${params.merchant_trans_id}${secretKey}`;
      const sign = crypto.createHash('md5').update(signString).digest('hex');
      
      params.sign = sign;
      
      // Click API ga so'rov yuborish
      const response = await axios.post('https://api.click.uz/v2/merchant', params);
      
      if (response.data && response.data.success) {
        return {
          success: true,
          paymentUrl: response.data.payment_url,
          transactionId: response.data.transaction_id
        };
      }
      
      throw new Error('Click API dan xatolik qaytdi');
    } catch (error) {
      console.error('Click payment error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }
  
  // Payme to'lov
  static async processPaymePayment(orderId, amount, phone) {
    try {
      if (!process.env.PAYME_MERCHANT_ID || !process.env.PAYME_SECRET_KEY) {
        throw new Error('Payme konfiguratsiyasi topilmadi');
      }
      
      const merchantId = process.env.PAYME_MERCHANT_ID;
      const account = {
        order_id: orderId
      };
      
      // Base64 encoded account
      const accountEncoded = Buffer.from(JSON.stringify(account)).toString('base64');
      
      const paymentUrl = `https://checkout.paycom.uz/${merchantId}?account=${accountEncoded}&amount=${amount * 100}`;
      
      return {
        success: true,
        paymentUrl,
        transactionId: `payme_${orderId}_${Date.now()}`
      };
    } catch (error) {
      console.error('Payme payment error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }
  
  // To'lov holatini tekshirish
  static async checkPaymentStatus(paymentId, provider) {
    try {
      switch (provider) {
        case 'click':
          return await this.checkClickPaymentStatus(paymentId);
        case 'payme':
          return await this.checkPaymePaymentStatus(paymentId);
        default:
          throw new Error('Noma\'lum to\'lov provayderi');
      }
    } catch (error) {
      console.error('Payment status check error:', error);
      return {
        success: false,
        status: 'unknown',
        message: error.message
      };
    }
  }
  
  static async checkClickPaymentStatus(paymentId) {
    try {
      // Click API orqali status tekshirish
      const response = await axios.get(`https://api.click.uz/v2/merchant/status/${paymentId}`);
      
      if (response.data) {
        return {
          success: true,
          status: response.data.status,
          amount: response.data.amount,
          transactionId: response.data.transaction_id
        };
      }
      
      throw new Error('Click API dan javob olmadi');
    } catch (error) {
      console.error('Click status check error:', error);
      return {
        success: false,
        status: 'unknown',
        message: error.message
      };
    }
  }
  
  static async checkPaymePaymentStatus(paymentId) {
    try {
      // Payme API orqali status tekshirish
      const auth = Buffer.from(`Paycom:${process.env.PAYME_SECRET_KEY}`).toString('base64');
      
      const response = await axios.post('https://checkout.paycom.uz/api', {
        method: 'GetStatement',
        params: {
          from: Date.now() - 86400000, // 24 soat oldin
          to: Date.now()
        }
      }, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data && response.data.result) {
        const transaction = response.data.result.transactions.find(t => t.id === paymentId);
        
        if (transaction) {
          return {
            success: true,
            status: transaction.state,
            amount: transaction.amount / 100,
            transactionId: transaction.id
          };
        }
      }
      
      throw new Error('Payme API dan javob olmadi');
    } catch (error) {
      console.error('Payme status check error:', error);
      return {
        success: false,
        status: 'unknown',
        message: error.message
      };
    }
  }
  
  // To'lov linkini yaratish
  static generatePaymentLink(orderId, amount, method, phone) {
    const baseUrl = process.env.BOT_URL || 'https://your-domain.com';
    
    switch (method) {
      case 'click':
        return `${baseUrl}/payment/click?order=${orderId}&amount=${amount}&phone=${phone}`;
      case 'payme':
        return `${baseUrl}/payment/payme?order=${orderId}&amount=${amount}&phone=${phone}`;
      case 'uzcard':
        return `${baseUrl}/payment/uzcard?order=${orderId}&amount=${amount}&phone=${phone}`;
      default:
        return null;
    }
  }
  
  // To'lov ma'lumotlarini saqlash
  static async savePaymentInfo(orderId, paymentData) {
    try {
      const { Order } = require('../models');
      
      const order = await Order.findOne({ orderId });
      if (!order) {
        throw new Error('Buyurtma topilmadi');
      }
      
      order.paymentId = paymentData.transactionId;
      order.paymentStatus = paymentData.status || 'pending';
      
      await order.save();
      
      return {
        success: true,
        order
      };
    } catch (error) {
      console.error('Save payment info error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }
}

module.exports = PaymentService;