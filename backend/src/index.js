const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
// ... import các routes khác nếu có

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
// ... các route khác

app.get('/', (req, res) => {
  res.send('Backend đang chạy!');
});

// 📌 Swagger UI – phải đặt TRƯỚC middleware 404
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// ❌ Middleware 404 – đặt ở CUỐI CÙNG
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint không tồn tại' });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});