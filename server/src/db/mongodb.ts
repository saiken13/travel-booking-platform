import mongoose, { Schema, Document } from 'mongoose';

export interface IUserSession extends Document {
  session_id: string;
  user_id: string;
  profile_data: {
    name?: string;
    email?: string;
    preferences?: {
      currency: string;
      class: string;
      notifications: boolean;
    };
  };
  last_active: Date;
  created_at: Date;
}

export interface ISearchHistory extends Document {
  user_id: string;
  queries: Array<{
    type: 'flight' | 'hotel';
    params: Record<string, unknown>;
    timestamp: Date;
  }>;
}

const UserSessionSchema = new Schema<IUserSession>({
  session_id: { type: String, required: true, unique: true, index: true },
  user_id: { type: String, required: true, index: true },
  profile_data: {
    name: String,
    email: String,
    preferences: {
      currency: { type: String, default: 'USD' },
      class: { type: String, default: 'economy' },
      notifications: { type: Boolean, default: true },
    },
  },
  last_active: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now },
});

const SearchHistorySchema = new Schema<ISearchHistory>({
  user_id: { type: String, required: true, unique: true, index: true },
  queries: [
    {
      type: { type: String, enum: ['flight', 'hotel'], required: true },
      params: { type: Schema.Types.Mixed },
      timestamp: { type: Date, default: Date.now },
    },
  ],
});

export const UserSession = mongoose.model<IUserSession>('UserSession', UserSessionSchema);
export const SearchHistory = mongoose.model<ISearchHistory>('SearchHistory', SearchHistorySchema);

export const connectMongoDB = async (): Promise<void> => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/travel_booking';
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    // Non-fatal — server continues without MongoDB
  }
};
