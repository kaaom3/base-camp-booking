require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const startCronJobs = require('./jobs/cronJobs');

const customerRoutes = require('./routes/customerRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// เชื่อมต่อ Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/api/customer', customerRoutes);
app.use('/api/admin', adminRoutes);

// รัน Cron Jobs
startCronJobs();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
