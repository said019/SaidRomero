import { Pool } from 'pg';

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var pool: Pool | undefined;
}

if (!global.pool) {
  global.pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

const pool = global.pool;
export default pool;
