const pool = require('./src/config/database');

async function testConnection() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('✅ Kết nối thành công! Thời gian hiện tại từ DB:', res.rows[0].now);
  } catch (err) {
    console.error('❌ Lỗi kết nối:', err);
  } finally {
    await pool.end();
  }
}

testConnection();