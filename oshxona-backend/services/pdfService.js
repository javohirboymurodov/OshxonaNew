const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { PassThrough } = require('stream');

class PDFService {
  // Buyurtma cheki yaratish
  static async generateOrderReceipt(order) {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const filename = `receipt_${order.orderId}.pdf`;
      const filepath = path.join(__dirname, '../temp', filename);
      
      // Temp papkani yaratish
      const tempDir = path.dirname(filepath);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      doc.pipe(fs.createWriteStream(filepath));
      
      // Sarlavha
      doc.fontSize(20).font('Helvetica-Bold').text('BUYURTMA CHEKI', { align: 'center' });
      doc.moveDown();
      
      // Kompaniya ma'lumotlari
      doc.fontSize(12).font('Helvetica');
      doc.text(process.env.COMPANY_NAME || 'Oshxona Professional', { align: 'center' });
      doc.text(process.env.COMPANY_ADDRESS || 'Toshkent, O\'zbekiston', { align: 'center' });
      doc.text(process.env.COMPANY_PHONE || '+998 90 123 45 67', { align: 'center' });
      doc.moveDown();
      
      // Chiziq
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();
      
      // Buyurtma ma'lumotlari
      doc.fontSize(10);
      doc.text(`Buyurtma raqami: ${order.orderId}`, 50, doc.y);
      doc.text(`Sana: ${order.createdAt.toLocaleDateString('uz-UZ')}`, 350, doc.y - 12);
      doc.text(`Vaqt: ${order.createdAt.toLocaleTimeString('uz-UZ')}`, 350, doc.y);
      doc.moveDown();
      
      // Mijoz ma'lumotlari
      doc.text(`Mijoz: ${order.customerInfo.name}`, 50, doc.y);
      doc.text(`Telefon: ${order.customerInfo.phone}`, 50, doc.y);
      
      if (order.orderType === 'delivery') {
        doc.text(`Manzil: ${order.deliveryInfo.address}`, 50, doc.y);
      }
      
      doc.moveDown();
      
      // Mahsulotlar jadvali
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('BUYURTMA TARKIBI:', 50, doc.y);
      doc.moveDown(0.5);
      
      // Jadval sarlavhasi
      doc.fontSize(10).font('Helvetica-Bold');
      const startY = doc.y;
      doc.text('№', 50, startY);
      doc.text('Mahsulot', 80, startY);
      doc.text('Miqdor', 350, startY);
      doc.text('Narx', 400, startY);
      doc.text('Jami', 480, startY);
      
      // Chiziq
      doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
      doc.moveDown();
      
      // Mahsulotlar ro'yxati
      doc.font('Helvetica');
      let currentY = doc.y;
      
      order.items.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        
        doc.text(`${index + 1}`, 50, currentY);
        doc.text(item.productName || 'Noma\'lum mahsulot', 80, currentY, { width: 250 });
        doc.text(`${item.quantity}x`, 350, currentY);
        doc.text(`${item.price.toLocaleString()} so'm`, 400, currentY);
        doc.text(`${itemTotal.toLocaleString()} so'm`, 480, currentY);
        
        currentY += 20;
        
        if (item.specialInstructions) {
          doc.fontSize(8).fillColor('gray');
          doc.text(`* ${item.specialInstructions}`, 80, currentY);
          currentY += 15;
          doc.fontSize(10).fillColor('black');
        }
      });
      
      doc.y = currentY + 10;
      
      // Chiziq
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();
      
      // Hisob-kitob
      doc.fontSize(10);
      const rightAlign = 480;
      
      doc.text('Oraliq jami:', 400, doc.y);
      doc.text(`${order.subtotal.toLocaleString()} so'm`, rightAlign, doc.y);
      doc.moveDown(0.5);
      
      if (order.deliveryFee > 0) {
        doc.text('Yetkazib berish:', 400, doc.y);
        doc.text(`${order.deliveryFee.toLocaleString()} so'm`, rightAlign, doc.y);
        doc.moveDown(0.5);
      }
      
      if (order.serviceFee > 0) {
        doc.text('Xizmat haqi:', 400, doc.y);
        doc.text(`${order.serviceFee.toLocaleString()} so'm`, rightAlign, doc.y);
        doc.moveDown(0.5);
      }
      
      if (order.discount > 0) {
        doc.text('Chegirma:', 400, doc.y);
        doc.text(`-${order.discount.toLocaleString()} so'm`, rightAlign, doc.y);
        doc.moveDown(0.5);
      }
      
      // Yakuniy summa
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('JAMI TO\'LOV:', 400, doc.y);
      doc.text(`${order.total.toLocaleString()} so'm`, rightAlign, doc.y);
      
      // To'lov usuli
      doc.fontSize(10).font('Helvetica');
      doc.moveDown();
      doc.text(`To'lov usuli: ${this.getPaymentMethodName(order.paymentMethod)}`, 50, doc.y);
      doc.text(`Holat: ${order.getStatusText()}`, 50, doc.y);
      
      // Pastki qism
      doc.moveDown(2);
      doc.fontSize(8).fillColor('gray');
      doc.text('Buyurtma bo\'yicha savollar uchun:', { align: 'center' });
      doc.text(process.env.COMPANY_PHONE || '+998 90 123 45 67', { align: 'center' });
      doc.text('Rahmat, qayta tashashingizni kutamiz!', { align: 'center' });
      
      doc.end();
      
      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          resolve({
            success: true,
            filename,
            filepath
          });
        });
        
        doc.on('error', (error) => {
          reject(error);
        });
      });
      
    } catch (error) {
      console.error('PDF generation error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }
  
  // Kunlik hisobot
  static async generateDailyReport(reportData) {
    try {
      const { date, orders } = reportData;
      
      const doc = new PDFDocument({ margin: 50 });
      const filename = `daily_report_${date.toISOString().split('T')[0]}.pdf`;
      const filepath = path.join(__dirname, '../temp', filename);
      
      const tempDir = path.dirname(filepath);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      doc.pipe(fs.createWriteStream(filepath));
      
      // Sarlavha
      doc.fontSize(18).font('Helvetica-Bold').text('KUNLIK HISOBOT', { align: 'center' });
      doc.moveDown();
      
      doc.fontSize(12).font('Helvetica');
      doc.text(`Sana: ${date.toLocaleDateString('uz-UZ')}`, { align: 'center' });
      doc.text(process.env.COMPANY_NAME || 'Oshxona Professional', { align: 'center' });
      doc.moveDown();
      
      // Umumiy statistika
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
      const completedOrders = orders.filter(order => 
        ['delivered', 'picked_up', 'completed'].includes(order.status)
      ).length;
      
      doc.fontSize(14).font('Helvetica-Bold');
      doc.text('UMUMIY STATISTIKA:', 50, doc.y);
      doc.moveDown(0.5);
      
      doc.fontSize(12).font('Helvetica');
      doc.text(`Jami buyurtmalar: ${totalOrders}`, 50, doc.y);
      doc.text(`Bajarilgan buyurtmalar: ${completedOrders}`, 50, doc.y);
      doc.text(`Jami tushum: ${totalRevenue.toLocaleString()} so'm`, 50, doc.y);
      doc.text(`O'rtacha buyurtma: ${totalOrders > 0 ? Math.round(totalRevenue / totalOrders).toLocaleString() : 0} so'm`, 50, doc.y);
      
      doc.moveDown();
      
      // Buyurtmalar ro'yxati
      if (orders.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold');
        doc.text('BUYURTMALAR RO\'YXATI:', 50, doc.y);
        doc.moveDown(0.5);
        
        orders.forEach((order, index) => {
          doc.fontSize(10).font('Helvetica');
          doc.text(`${index + 1}. ${order.orderId} - ${order.total.toLocaleString()} so'm - ${order.getStatusText()}`, 50, doc.y);
          doc.text(`   ${order.createdAt.toLocaleTimeString('uz-UZ')} - ${order.customerInfo.name}`, 50, doc.y);
          doc.moveDown(0.3);
        });
      }
      
      doc.end();
      
      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          resolve({
            success: true,
            filename,
            filepath
          });
        });
        
        doc.on('error', (error) => {
          reject(error);
        });
      });
      
    } catch (error) {
      console.error('Daily report generation error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }
  
  static getPaymentMethodName(method) {
    const methods = {
      cash: 'Naqd pul',
      card: 'Plastik karta',
      click: 'Click',
      payme: 'Payme',
      uzcard: 'UzCard',
      humo: 'Humo'
    };
    
    return methods[method] || method;
  }

  // Stol QR kodining PDF faylini yaratish (buffer/stream)
  // qrPngBuffer: QRCode.toBuffer() natijasi
  static generateTableQrPdf({ tableNumber, link, qrPngBuffer }) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const stream = new PassThrough();
        const filename = `table_${tableNumber}_qr.pdf`;

        doc.pipe(stream);

        // Sarlavha
        doc.fontSize(22).font('Helvetica-Bold').text('Stol uchun QR kod', { align: 'center' });
        doc.moveDown();
        doc.fontSize(16).font('Helvetica').text(`Stol raqami: ${tableNumber}`, { align: 'center' });
        doc.moveDown();

        // QR rasm (bufferdan bevosita)
        const pageWidth = doc.page.width;
        const qrSize = 300;
        const x = (pageWidth - qrSize) / 2;
        try {
          doc.image(qrPngBuffer, x, doc.y, { width: qrSize, height: qrSize });
        } catch {}
        doc.moveDown(2);

        // Link va izoh
        doc.fontSize(12).text('Quyidagi QR kodni skaner qiling yoki linkdan foydalaning:', { align: 'center' });
        doc.moveDown(0.5);
        if (link) {
          doc.font('Helvetica-Oblique').fillColor('blue').text(link, { align: 'center', link });
          doc.fillColor('black').font('Helvetica');
        }
        doc.moveDown(2);
        doc.text('QR kodni chop etib stol ustiga yopishtiring. Mijoz shu QR orqali botni ochadi va stol raqami bilan buyurtma qiladi.', {
          align: 'center'
        });

        doc.end();

        const buffers = [];
        stream.on('data', (chunk) => buffers.push(chunk));
        stream.on('end', () => resolve({ filename, buffer: Buffer.concat(buffers) }));
        stream.on('error', reject);
      } catch (e) {
        reject(e);
      }
    });
  }
}

module.exports = PDFService;