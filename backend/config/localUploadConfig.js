const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Local storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const ext = path.extname(file.originalname);
    cb(null, `product_${timestamp}_${random}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Faqat rasm fayllari ruxsat etilgan!'), false);
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// Upload middlewares
const uploadSingle = upload.single('image');
const uploadMultiple = upload.array('images', 5);

// Error handling middleware
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Fayl hajmi 5MB dan oshmasligi kerak!'
      });
    }
    return res.status(400).json({
      success: false,
      message: 'Fayl yuklashda xatolik!'
    });
  }
  
  if (error) {
    console.error('Upload error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Fayl yuklashda xatolik!'
    });
  }
  
  next();
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  handleUploadError
};