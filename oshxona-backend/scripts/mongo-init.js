// MongoDB initialization script
db = db.getSiblingDB('oshxona');

// Create user
db.createUser({
  user: 'oshxona_user',
  pwd: 'secure_password_here',
  roles: [
    {
      role: 'readWrite',
      db: 'oshxona'
    }
  ]
});

// Create indexes
db.users.createIndex({ "telegramId": 1 }, { unique: true });
db.users.createIndex({ "phone": 1 });
db.users.createIndex({ "email": 1 });
db.users.createIndex({ "lastActivity": 1 });

db.orders.createIndex({ "orderId": 1 }, { unique: true });
db.orders.createIndex({ "user": 1 });
db.orders.createIndex({ "status": 1 });
db.orders.createIndex({ "createdAt": 1 });
db.orders.createIndex({ "orderType": 1 });

db.products.createIndex({ "categoryId": 1 });
db.products.createIndex({ "name": 1 });
db.products.createIndex({ "isActive": 1, "isAvailable": 1 });
db.products.createIndex({ "isPopular": 1 });
db.products.createIndex({ "price": 1 });

db.categories.createIndex({ "id": 1 }, { unique: true });
db.categories.createIndex({ "isActive": 1, "isVisible": 1 });
db.categories.createIndex({ "sortOrder": 1 });

db.carts.createIndex({ "user": 1, "isActive": 1 });
db.carts.createIndex({ "updatedAt": 1 });

console.log('MongoDB initialized with indexes');