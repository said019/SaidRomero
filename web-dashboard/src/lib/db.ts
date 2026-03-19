import { Pool } from 'pg';

// Create a single pool instance to be reused
let pool: Pool;

if (!global.pool) {
  global.pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
}

pool = global.pool;

export default pool;
