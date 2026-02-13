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
<<<<<<< HEAD
/* added comment for main branch*/
=======
/* comment for predprod push */
>>>>>>> main_predprod
