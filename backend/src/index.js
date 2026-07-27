const express = require('express');
const { pool, connectWithRetry } = require('./db/connection');
const tasksRouter = require('./routes/tasks');

function createApp(deps = {}) {
  const dbPool = deps.pool || pool;

  const app = express();

  // Make pool available to route handlers via app.locals
  app.locals.pool = dbPool;

  // JSON parsing middleware
  app.use(express.json());

  // CORS middleware
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // Health check endpoint
  app.get('/health', async (req, res) => {
    try {
      const client = await dbPool.connect();
      client.release();
      res.status(200).json({ status: 'ok' });
    } catch (err) {
      res.status(503).json({ error: 'Database unavailable' });
    }
  });

  // Task CRUD routes
  app.use('/api/tasks', tasksRouter);

  // Global error handler
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

const app = createApp();

// Start server (only when run directly, not when imported for testing)
if (require.main === module) {
  connectWithRetry().then(() => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Backend API listening on port ${PORT}`);
    });
  });
}

module.exports = app;
module.exports.createApp = createApp;
