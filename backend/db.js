const { Pool } = require('pg');

const useConnectionString = Boolean(process.env.DATABASE_URL);

const pool = new Pool(
    useConnectionString
        ? {
              connectionString: process.env.DATABASE_URL,
              ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false,
          }
        : {
              host: process.env.DB_HOST || 'localhost',
              port: Number(process.env.DB_PORT) || 5432,
              user: process.env.DB_USER || 'postgres',
              password: process.env.DB_PASSWORD || 'postgres',
              database: process.env.DB_NAME || 'ty_main',
              ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false,
          }
);

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
};
