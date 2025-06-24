// src/server.ts
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db';
import authRoutes from './routes/authRoutes';
import eventRoutes from './routes/eventRoutes';
import userRoutes from './routes/userRoutes';
import discountRoutes from './routes/discountRoutes';
import startCronJobs from './utils/cronJobs'; 
import fs from 'fs';
import https from 'https'; 

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Init middleware
app.use(express.json()); // Body parser for JSON
app.use(cors()); // Enable CORS for all origins (for development)

// Define a simple root route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Define API routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/users', userRoutes);
app.use('/api/discounts', discountRoutes);

const PORT: number = parseInt(process.env.PORT || '5000', 10);

const options = {
  key: fs.readFileSync('../Event_Organization/localhost+1-key.pem'), 
  cert: fs.readFileSync('../Event_Organization/localhost+1.pem'),    
};

https.createServer(options, app).listen(PORT, '0.0.0.0', () => {
  console.log(`HTTPS Server running on https://0.0.0.0:${PORT}`);
  startCronJobs();
});