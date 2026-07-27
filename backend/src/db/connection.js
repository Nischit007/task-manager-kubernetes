const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres-service',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'workshop',
  user: process.env.DB_USER || 'workshop',
  password: process.env.DB_PASSWORD,
});

/**
 * Attempts to connect to the database with retry logic.
 * Retries up to 3 times with a 2-second delay between attempts.
 * @returns {Promise<boolean>} true if connection succeeds, false otherwise
 */
async function connectWithRetry() {
  const maxAttempts = 3;
  const delayMs = 2000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const client = await pool.connect();
      client.release();
      console.log('Database connected successfully');
      return true;
    } catch (err) {
      console.error(`Database connection attempt ${attempt}/${maxAttempts} failed:`, err.message);
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  console.error('All database connection attempts failed');
  return false;
}

module.exports = { pool, connectWithRetry };
