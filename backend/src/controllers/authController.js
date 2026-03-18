const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
require('dotenv').config();

const authController = {
  login: async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Vui lòng cung cấp email và mật khẩu' });
    }

    try {
      const user = await userModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
      }

      const token = jwt.sign(
        {
          userId: user.user_id,
          email: user.email,
          roleId: user.role_id,
          name: user.name
        },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );

      res.json({
        token,
        user: {
          id: user.user_id,
          name: user.name,
          email: user.email,
          roleId: user.role_id,
          departmentId: user.department_id
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  me: async (req, res) => {
    try {
      const user = await userModel.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: 'Không tìm thấy user' });
      }
      res.json(user);
    } catch (error) {
      console.error('Me error:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  logout: (req, res) => {
    res.json({ message: 'Đăng xuất thành công (client xóa token)' });
  }
};

module.exports = authController;