const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');

// Cloudinary konfiguratsiya
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cloudinary storage konfiguratsiya
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'oshxona', // Cloudinary'dagi papka nomi
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [
      { 
        width: 800, 
        height: 600, 
        crop: 'limit', 
        quality: 'auto:good',
        fetch_format: 'auto' // Avtomatik format tanlash
      }
    ],
    // Fayl nomini o'zgartirish
    public_id: (req, file) => {
      const timestamp = Date.now();
      const originalName = path.parse(file.originalname).name;
      return `product_${timestamp}_${originalName}`;
    }
  }
});

// Multer konfiguratsiya
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 5 // Maksimal 5 ta fayl
  },
  fileFilter: (req, file, cb) => {
    // Faqat rasm fayllarini qabul qilish
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Faqat rasm fayllari qabul qilinadi!'), false);
    }
  }
});

// Cloudinary yordamchi funksiyalari
class CloudinaryService {
  // Rasm yuklash
  static async uploadImage(file, options = {}) {
    try {
      const defaultOptions = {
        folder: 'oshxona',
        width: 800,
        height: 600,
        crop: 'limit',
        quality: 'auto:good'
      };
      
      const uploadOptions = { ...defaultOptions, ...options };
      
      const result = await cloudinary.uploader.upload(file.path || file.buffer, uploadOptions);
      
      return {
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes
      };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Rasm o'chirish
  static async deleteImage(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return {
        success: result.result === 'ok',
        result: result.result
      };
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Rasmni transformatsiya qilish
  static getTransformedUrl(publicId, transformations = {}) {
    const defaultTransformations = {
      quality: 'auto:good',
      fetch_format: 'auto'
    };
    
    const finalTransformations = { ...defaultTransformations, ...transformations };
    
    return cloudinary.url(publicId, finalTransformations);
  }
  
  // Thumbnail yaratish
  static getThumbnail(publicId, width = 200, height = 200) {
    return this.getTransformedUrl(publicId, {
      width,
      height,
      crop: 'fill',
      gravity: 'center'
    });
  }
  
  // Ko'p hajmli rasmlar (responsive)
  static getResponsiveUrls(publicId) {
    return {
      small: this.getTransformedUrl(publicId, { width: 300, height: 225 }),
      medium: this.getTransformedUrl(publicId, { width: 600, height: 450 }),
      large: this.getTransformedUrl(publicId, { width: 1200, height: 900 }),
      thumbnail: this.getThumbnail(publicId, 150, 150)
    };
  }
  
  // Watermark qo'shish (agar kerak bo'lsa)
  static addWatermark(publicId, watermarkText = 'Oshxona') {
    return this.getTransformedUrl(publicId, {
      overlay: {
        text: watermarkText,
        font_family: 'Arial',
        font_size: 30,
        color: 'white'
      },
      gravity: 'south_east',
      x: 10,
      y: 10
    });
  }
  
  // Batch upload (ko'p rasmlar bir vaqtda)
  static async uploadMultipleImages(files, options = {}) {
    const results = [];
    
    for (const file of files) {
      const result = await this.uploadImage(file, options);
      results.push(result);
    }
    
    return results;
  }
  
  // Storage ma'lumotlari
  static async getStorageInfo() {
    try {
      const result = await cloudinary.api.usage();
      return {
        success: true,
        usage: {
          storage: result.storage,
          bandwidth: result.bandwidth,
          requests: result.requests,
          transformations: result.transformations,
          objects: result.objects
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Multer middleware funksiyalari
const uploadSingle = upload.single('image');
const uploadMultiple = upload.array('images', 5);
const uploadFields = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'gallery', maxCount: 5 }
]);

// Error handling middleware
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Fayl hajmi juda katta! Maksimal 5MB'
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Juda ko\'p fayl! Maksimal 5 ta'
      });
    }
  }
  
  if (error.message === 'Faqat rasm fayllari qabul qilinadi!') {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
};

module.exports = {
  cloudinary,
  CloudinaryService,
  upload,
  uploadSingle,
  uploadMultiple,
  uploadFields,
  handleUploadError
};
