
require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const { connectToDb } = require('./config/database');
const recordRoutes = require('./api/records');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/records', recordRoutes);

// Start server
connectToDb().then(() => {
    app.listen(port, () => {
        console.log(`Server running on port: ${port}`);
    });
}).catch(error => {
    console.error("Failed to connect to the database", error);
    process.exit(1);
});
