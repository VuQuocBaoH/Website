import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db';
import authRoutes from './routes/authRoutes';
import eventRoutes from './routes/eventRoutes';
import userRoutes from './routes/userRoutes';
import discountRoutes from './routes/discountRoutes';


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

// TODO: Add your API routes here (Event and Auth routes)
// Define API routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes); 
app.use('/api/users', userRoutes);
app.use('/api/discounts', discountRoutes);


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));