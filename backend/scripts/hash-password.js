const bcrypt = require('bcryptjs');
const pool = require('../src/config/database'); // đường dẫn tương đối

async function hashPasswords() {
  const users = [
    { email: 's.mitchell@uni.ac.uk', password: 'Password123' },
    { email: 'c.thompson@uni.ac.uk', password: 'Password123' },
    { email: 'd.harrison@uni.ac.uk', password: 'Password123' },
    { email: 't.brady@uni.ac.uk', password: 'Password123' }
  ];

  try {
    for (const user of users) {
      const hashed = await bcrypt.hash(user.password, 10);
      await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hashed, user.email]);
      console.log(`✅ Đã cập nhật password cho ${user.email}`);
    }
  } catch (err) {
    console.error('❌ Lỗi:', err);
  } finally {
    await pool.end();
  }
}

hashPasswords();