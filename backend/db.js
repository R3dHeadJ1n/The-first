const { Pool } = require('pg');

const useConnectionString = Boolean(process.env.DATABASE_URL);

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
};
