const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
require('dotenv').config();

class DatabaseBackup {
  static async run() {
    try {
      console.log('💾 Database backup boshlandi...');
      
      const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
      const backupDir = path.join(__dirname, '../backups');
      const backupFile = path.join(backupDir, `backup_${timestamp}`);
      
      // Backup papkasini yaratish
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      // MongoDB URI dan database nomini olish
      const dbName = this.extractDbName(process.env.MONGODB_URI);
      
      // Mongodump buyrug'i
      const command = `mongodump --uri="${process.env.MONGODB_URI}" --out="${backupFile}"`;
      
      console.log('🔄 Backup jarayoni...');
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Backup xatosi:', error);
          return;
        }
        
        if (stderr) {
          console.log('⚠️  Stderr:', stderr);
        }
        
        console.log('✅ Backup muvaffaqiyatli yaratildi!');
        console.log(`📂 Fayl: ${backupFile}`);
        console.log(`📊 Hajm: ${this.getDirectorySize(backupFile)} MB`);
        
        // Eski backuplarni tozalash (30 kundan eski)
        this.cleanOldBackups(backupDir);
      });
      
    } catch (error) {
      console.error('❌ Backup jarayonida xatolik:', error);
    }
  }
  
  static extractDbName(uri) {
    const match = uri.match(/\/([^?]+)/);
    return match ? match[1] : 'oshxona';
  }
  
  static getDirectorySize(dirPath) {
    let totalSize = 0;
    
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const file of files) {
      const fullPath = path.join(dirPath, file.name);
      
      if (file.isDirectory()) {
        totalSize += this.getDirectorySize(fullPath);
      } else {
        totalSize += fs.statSync(fullPath).size;
      }
    }
    
    return (totalSize / (1024 * 1024)).toFixed(2); // MB
  }
  
  static cleanOldBackups(backupDir) {
    try {
      const files = fs.readdirSync(backupDir);
      const thirtyDaysAgo = moment().subtract(30, 'days');
      
      files.forEach(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        
        if (moment(stats.mtime).isBefore(thirtyDaysAgo)) {
          if (stats.isDirectory()) {
            fs.rmSync(filePath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(filePath);
          }
          console.log(`🗑️  Eski backup o'chirildi: ${file}`);
        }
      });
    } catch (error) {
      console.error('Eski backuplarni tozalashda xatolik:', error);
    }
  }
}

// Script ishga tushirish
if (require.main === module) {
  DatabaseBackup.run();
}

module.exports = DatabaseBackup;