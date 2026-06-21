// Auto-push enabled server configuration
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const judgeRoutes = require('./routes/judgeRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();
const path = require('path');
const fs = require('fs');

// Ensure uploads folder exists
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api/uploads', express.static(uploadsPath));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/judge', judgeRoutes);
app.use('/api/reports', reportRoutes);

// Test Endpoint
app.get('/', (req, res) => {
  res.json({ message: 'NPC_Evaluate API is running smoothly' });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
