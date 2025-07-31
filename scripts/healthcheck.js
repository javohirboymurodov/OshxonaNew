const http = require('http');
const mongoose = require('mongoose');

const healthcheck = () => {
  const options = {
    hostname: 'localhost',
    port: process.env.PORT || 3000,
    path: '/health',
    method: 'GET',
    timeout: 2000
  };

  const req = http.request(options, (res) => {
    if (res.statusCode === 200) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  });

  req.on('error', () => {
    process.exit(1);
  });

  req.on('timeout', () => {
    req.destroy();
    process.exit(1);
  });

  req.end();
};

// MongoDB connection check
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/oshxona', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
}).then(() => {
  mongoose.disconnect();
  healthcheck();
}).catch(() => {
  process.exit(1);
});