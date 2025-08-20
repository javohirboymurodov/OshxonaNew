const mongoose = require('mongoose');
const logger = require('../utils/logger');

class Database {
    constructor() {
        this.connection = null;
        this.isConnected = false;
    }

    async connect() {
        if (this.isConnected) {
            logger.info('🔄 Database already connected');
            return this.connection;
        }

        try {
            // MongoDB connection with timeout
            const db='mongodb+srv://javohir:<db_password>@cluster0.jjsllqm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
            const connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017/pizza_bot';
            
            logger.info(`🔌 Attempting to connect to MongoDB: ${connectionString}`);
            
            const connection = await mongoose.connect(connectionString, {
                serverSelectionTimeoutMS: 5000, // 5 second timeout
                socketTimeoutMS: 45000,
                bufferCommands: false,
                maxPoolSize: 10,
                minPoolSize: 1
            });

            this.connection = connection;
            this.isConnected = true;
            
            logger.info('✅ MongoDB connected successfully');
            
            // Listen for connection events
            mongoose.connection.on('error', (err) => {
                logger.error('❌ MongoDB connection error:', err);
                this.isConnected = false;
            });

            mongoose.connection.on('disconnected', () => {
                logger.warn('⚠️ MongoDB disconnected');
                this.isConnected = false;
            });

            return connection;

        } catch (error) {
            logger.error('❌ MongoDB connection failed:', error.message);
            logger.warn('🔄 Continuing without database (memory mode)');
            this.isConnected = false;
            return null;
        }
    }

    async disconnect() {
        if (this.connection) {
            await mongoose.disconnect();
            this.isConnected = false;
            logger.info('🔌 MongoDB disconnected');
        }
    }

    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            readyState: mongoose.connection.readyState,
            host: mongoose.connection.host,
            port: mongoose.connection.port,
            name: mongoose.connection.name
        };
    }
}

// Create singleton instance
const database = new Database();

module.exports = database;
