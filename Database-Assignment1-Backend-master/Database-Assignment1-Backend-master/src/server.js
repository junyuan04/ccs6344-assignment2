require("dotenv").config();
const { getPool, query } = require("./config/db");

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;

// Import all routes
const authRoutes = require('./routes/auth');
const billRoutes = require('./routes/bills');
const userRoutes = require('./routes/users');
const profilesRoutes = require("./routes/profiles");
const customersRoutes = require("./routes/customers");
const staffsRoutes = require("./routes/staffs");
const adminsRoutes = require("./routes/admins");
const billsRoutes = require("./routes/bills");
const tariffsRoutes = require("./routes/tariffs");
const feedbackRoutes = require("./routes/feedbacks");
const auditLogsRoutes = require("./routes/auditLogs");


// Middleware
const errorHandler = require("./middleware/errorHandler");
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({
    message: 'Electricity Billing System API is running!',
    endpoints: {
      health: "/api/health",
      dbtest: "/api/dbtest",
      auth: '/api/auth',
      bills: '/api/bills',
      users: '/api/users'
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/users', userRoutes);
app.use("/api/profiles", profilesRoutes);
app.use("/api/customers", customersRoutes);
app.use("/api/staffs", staffsRoutes);
app.use("/api/admins", adminsRoutes);
app.use("/api/bills", billsRoutes);
app.use("/api/tariffs", tariffsRoutes);
app.use("/api/feedbacks", feedbackRoutes);
app.use("/api/auditlogs", auditLogsRoutes);


// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({ ok: true });
});

app.get("/api/dbtest", async (req, res) => {
  try {
    const result = await query("SELECT current_database() AS dbname, now() AS now");
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use(errorHandler);

// Start server first (so ALB health check can pass even if DB is down)
app.listen(PORT, () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});

// Then try DB connection (non-blocking)
getPool()
  .then(() => console.log("DB connected"))
  .catch((err) => console.error("DB connection failed:", err.message));