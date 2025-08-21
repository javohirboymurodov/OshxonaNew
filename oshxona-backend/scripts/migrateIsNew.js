const mongoose = require('mongoose');
require('dotenv').config();

async function migrateIsNewField() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('🔄 Migrating isNew field to isNewProduct...');
    
    // Products collection
    const productsResult = await mongoose.connection.db.collection('products').updateMany(
      { isNew: { $exists: true } },
      { 
        $rename: { isNew: 'isNewProduct' }
      }
    );
    
    console.log(`✅ Products updated: ${productsResult.modifiedCount}`);
    
    // Categories collection (agar kerak bo'lsa)
    const categoriesResult = await mongoose.connection.db.collection('categories').updateMany(
      { isNew: { $exists: true } },
      { 
        $rename: { isNew: 'isNewCategory' }
      }
    );
    
    console.log(`✅ Categories updated: ${categoriesResult.modifiedCount}`);
    
    // Orders collection (agar kerak bo'lsa)
    const ordersResult = await mongoose.connection.db.collection('orders').updateMany(
      { isNew: { $exists: true } },
      { 
        $rename: { isNew: 'isNewOrder' }
      }
    );
    
    console.log(`✅ Orders updated: ${ordersResult.modifiedCount}`);
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

migrateIsNewField();