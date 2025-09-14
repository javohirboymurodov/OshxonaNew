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
            // MongoDB connection with timeout - ONLY use environment variable
            const connectionString = process.env.MONGODB_URI;
            const inProduction = process.env.NODE_ENV === 'production';

            // MONGODB_URI majburiy
            if (!connectionString || !connectionString.trim()) {
                logger.error('❌ MONGODB_URI env variable topilmadi. Majburiy.');
                throw new Error('MONGODB_URI is required');
            }
            
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
            const inProduction = process.env.NODE_ENV === 'production';
            if (inProduction) {
                // Productionda ulanish bo'lmasa xato bilan to'xtatamiz
                throw error;
            }
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
