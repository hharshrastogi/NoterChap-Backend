import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://hharshrastogi:9WwlcH3rF1UoBbI3@noter-chapmain.upd70xe.mongodb.net/noterchap?retryWrites=true&w=majority&appName=Noter-ChapMain&ssl=true';

let isConnected = false;

export const connectDB = async () => {
  if (isConnected) {
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    
    // Try alternative connection method
    console.log('Trying alternative connection...');
    try {
      await mongoose.connect(MONGODB_URI.replace('ssl=true', ''), {
        ssl: false,
        serverSelectionTimeoutMS: 5000,
      });
      isConnected = true;
      console.log('MongoDB connected successfully with alternative method');
    } catch (altError) {
      console.error('Alternative connection failed:', altError);
      process.exit(1);
    }
  }
};

export default mongoose;