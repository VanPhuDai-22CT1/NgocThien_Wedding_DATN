const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DB_NAME = process.env.DB_NAME || 'ngocthienwedding';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_HOST = !process.env.DB_HOST || process.env.DB_HOST === 'localhost' ? '127.0.0.1' : process.env.DB_HOST;
const DB_PORT = Number(process.env.DB_PORT || 3306);

async function run() {
  let adminConn;
  let dbConn;
  try {
    if (!/^[a-zA-Z0-9_]+$/.test(DB_NAME)) throw new Error('Invalid DB_NAME');
    console.log('Connecting to MySQL server...');
    adminConn = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      multipleStatements: true,
    });

    console.log(`Creating database if not exists: ${DB_NAME}`);
    await adminConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);

    const [tables] = await adminConn.execute('SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = ?', [DB_NAME]);
    if (Number(tables[0].total) > 0) {
      throw new Error('Database already contains tables. Import refused to preserve existing data; init-db only initializes an empty database.');
    }

    // choose SQL file to import
    const sqlFile = path.resolve(__dirname, '../database/ngocthienwedding_final.sql');
    if (!fs.existsSync(sqlFile)) {
      throw new Error(`SQL file not found at ${sqlFile}`);
    }

    const sql = fs.readFileSync(sqlFile, { encoding: 'utf8' });

    console.log('Importing SQL file to database... This may take a while.');
    // connect directly to the created database
    dbConn = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      multipleStatements: true,
    });

    await dbConn.query(sql);
    console.log('✅ Database import completed.');

  } catch (err) {
    console.error('❌ Failed to initialize database:', err.message || err);
    process.exitCode = 1;
  } finally {
    if (dbConn) await dbConn.end();
    if (adminConn) await adminConn.end();
  }
}

run();
