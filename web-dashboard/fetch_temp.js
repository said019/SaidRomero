const { Pool } = require('pg');
const pool = new Pool({
  connectionString: "postgres://967876762302e8f61f375dade6e3590d13984f254152e6c6483484c40863d8dd:sk_R8-NsgqrvnGvTsTf8j60W@db.prisma.io:5432/postgres?sslmode=require"
});

async function main() {
  try {
    const datesRes = await pool.query("SELECT DATE(created_at) as log_date, COUNT(*) as count FROM log_data GROUP BY DATE(created_at) ORDER BY log_date DESC LIMIT 10");
    console.log("Available dates:");
    console.table(datesRes.rows);

    const sampleRes = await pool.query("SELECT * FROM log_data ORDER BY created_at DESC LIMIT 5");
    console.log("\nSample data:");
    console.log(sampleRes.rows);

    // Get an example of data between dates
    const dataRes = await pool.query("SELECT COUNT(*) FROM log_data WHERE created_at >= '2026-03-24' AND created_at < '2026-03-30'");
    console.log(`\nRecords between Mar 24 and Mar 29: ${dataRes.rows[0].count}`);

  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

main();
