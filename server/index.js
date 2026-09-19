const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { initializeDatabase } = require('./config/database');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const reviewRoutes = require('./routes/reviews');
const dashboardRoutes = require('./routes/dashboard');
const paymentRoutes = require('./routes/payments');
const aiRoutes = require('./routes/ai');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || '0.0.0.0';
const CLIENT_PATH = path.join(__dirname, '..', 'client');
const MAX_PORT_ATTEMPTS = 20;
let isDatabaseReady = false;
let databaseErrorMessage = '';

app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'SheMarket API',
    database: isDatabaseReady ? 'connected' : 'disconnected',
    databaseError: isDatabaseReady ? '' : databaseErrorMessage
  });
});

app.use('/api', (req, res, next) => {
  if (isDatabaseReady) {
    next();
    return;
  }

  res.status(503).json({
    message: databaseErrorMessage
      ? `Database is not connected: ${databaseErrorMessage}`
      : 'Database is not connected. Start MySQL and refresh the page.'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);

app.use(express.static(CLIENT_PATH));

app.get('/', (req, res) => {
  res.sendFile(path.join(CLIENT_PATH, 'index.html'));
});

app.use('/api', (req, res) => {
  res.status(404).json({ message: 'API route not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.statusCode || 500;
  res.status(status).json({
    message: err.message || 'Something went wrong on the server.'
  });
});

listenWithPortFallback(PORT);

initializeDatabase()
  .then(() => {
    isDatabaseReady = true;
    databaseErrorMessage = '';
    console.log('MySQL connected and tables are ready');
  })
  .catch((error) => {
    isDatabaseReady = false;
    databaseErrorMessage = error.message;
    console.error('MySQL connection failed:', error.message);
    console.error('SheMarket is still serving the frontend. Start MySQL and restart the server for full functionality.');
  });

function listenWithPortFallback(port, attempts = 0) {
  const server = app.listen(port, HOST, () => {
    console.log(`SheMarket running at http://localhost:${port}`);
    if (HOST === '0.0.0.0') {
      console.log(`Other devices on the same Wi-Fi/hotspot can open http://<this-pc-ip>:${port}`);
    }
    if (port !== PORT) {
      console.log(`Port ${PORT} was busy, so SheMarket started on ${port}.`);
    }
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && attempts < MAX_PORT_ATTEMPTS) {
      const nextPort = port + 1;
      console.warn(`Port ${port} is already in use. Trying ${nextPort}...`);
      server.close(() => listenWithPortFallback(nextPort, attempts + 1));
      return;
    }

    console.error(`Unable to start SheMarket server: ${error.message}`);
    process.exit(1);
  });
}
