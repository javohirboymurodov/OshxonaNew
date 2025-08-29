const fs = require('fs');
const path = require('path');

class FileService {
  /**
   * Delete image file from uploads directory
   * @param {string} imagePath - Image path or filename
   * @returns {boolean} - Success status
   */
  static deleteImage(imagePath) {
    try {
      if (!imagePath) return false;

      let fullPath;

      // Agar to'liq path bo'lsa
      if (imagePath.includes('/uploads/')) {
        const fileName = imagePath.replace('/uploads/', '');
        fullPath = path.join(__dirname, '../uploads', fileName);
      } else {
        // Agar faqat filename bo'lsa
        fullPath = path.join(__dirname, '../uploads', imagePath);
      }

      // Faylni tekshirish va o'chirish
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log('✅ Fayl o\'chirildi:', fullPath);
        return true;
      } else {
        console.log('⚠️ Fayl topilmadi:', fullPath);
        return false;
      }
    } catch (error) {
      console.error('❌ Faylni o\'chirishda xatolik:', error);
      return false;
    }
  }

  /**
   * Clean up orphaned files in uploads directory
   */
  static async cleanupOrphanedFiles() {
    try {
      const { Product } = require('../models');
      const uploadsDir = path.join(__dirname, '../uploads');
      
      if (!fs.existsSync(uploadsDir)) return;

      // Barcha fayllarni olish
      const files = fs.readdirSync(uploadsDir);
      
      // Database'dagi barcha rasmlarni olish
      const products = await Product.find({}, 'image imageFileName');
      const usedImages = new Set();
      
      products.forEach(product => {
        if (product.imageFileName) {
          usedImages.add(product.imageFileName);
        }
        if (product.image && product.image.includes('/uploads/')) {
          const fileName = product.image.replace('/uploads/', '');
          usedImages.add(fileName);
        }
      });

      // Foydalanilmagan fayllarni o'chirish
      let deletedCount = 0;
      files.forEach(file => {
        if (!usedImages.has(file)) {
          const filePath = path.join(uploadsDir, file);
          fs.unlinkSync(filePath);
          deletedCount++;
          console.log('🗑️ Orphaned file deleted:', file);
        }
      });

      console.log(`✅ Cleanup completed. Deleted ${deletedCount} orphaned files.`);
      return deletedCount;
    } catch (error) {
      console.error('❌ Cleanup xatosi:', error);
      return 0;
    }
  }
}

module.exports = FileService;