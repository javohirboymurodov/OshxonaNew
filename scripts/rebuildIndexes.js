const mongoose = require('mongoose');
require('dotenv').config();

async function rebuildIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const collections = ['users', 'orders', 'categories', 'products', 'promocodes', 'tables'];
    
    for (const collectionName of collections) {
      console.log(`🔄 Rebuilding indexes for ${collectionName}...`);
      
      const collection = mongoose.connection.db.collection(collectionName);
      
      // Eski indexlarni o'chirish (default _id dan tashqari)
      const indexes = await collection.indexes();
      for (const index of indexes) {
        if (index.name !== '_id_') {
          await collection.dropIndex(index.name);
          console.log(`  ❌ Dropped index: ${index.name}`);
        }
      }
    }
    
    console.log('✅ All indexes rebuilt!');
    console.log('🔄 Restart the application to create new indexes.');
    
  } catch (error) {
    console.error('❌ Error rebuilding indexes:', error);
  } finally {
    await mongoose.disconnect();
  }
}

rebuildIndexes();