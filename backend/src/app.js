const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const env = require('./config/env');
const routes = require('./routes');
const { apiLimiter } = require('./middleware/rateLimits');
const { notFound, errorHandler } = require('./middleware/errors');
const AppError = require('./utils/AppError');

function createApp() {
  const app = express();
  app.set('trust proxy', 1); // correct client IPs behind Render's proxy (for rate limiting)
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(cors({
    origin(origin, cb) {
      // No Origin header = curl/Postman/native call. Otherwise it must be on the allow-list.
      if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
      return cb(new AppError(403, 'CORS_BLOCKED', 'Origin not allowed.'));
    },
  }));
  app.use(express.json({ limit: '100kb' }));
  if (env.nodeEnv !== 'test') app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

  app.get('/api/health', (req, res) => {
    const up = mongoose.connection.readyState === 1;
    res.status(up ? 200 : 503).json({ status: up ? 'ok' : 'degraded', db: up ? 'connected' : 'disconnected' });
  });

  app.use('/api', apiLimiter, routes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };