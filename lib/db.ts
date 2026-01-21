import mysql from 'mysql2/promise';

let pool: mysql.Pool;

export function getDb() {
  if (!pool) {
    pool = mysql.createPool({
      uri: process.env.DATABASE_URL, // .env dosyasındaki linki kullanır
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: {
        rejectUnauthorized: true // TiDB için gerekli güvenlik ayarı
      }
    });
  }
  return pool;
}