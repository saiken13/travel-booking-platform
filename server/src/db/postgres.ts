import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const initializePostgres = async (): Promise<void> => {
  let client: PoolClient | null = null;
  try {
    client = await pool.connect();
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        type VARCHAR(50) NOT NULL CHECK (type IN ('flight', 'hotel', 'package')),
        origin VARCHAR(10),
        destination VARCHAR(10) NOT NULL,
        dates JSONB NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
        booking_data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS experiments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        variants JSONB NOT NULL,
        start_date TIMESTAMP WITH TIME ZONE,
        end_date TIMESTAMP WITH TIME ZONE,
        status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS experiment_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        experiment_id UUID REFERENCES experiments(id) ON DELETE CASCADE,
        variant VARCHAR(255) NOT NULL,
        user_id VARCHAR(255),
        event_type VARCHAR(100) NOT NULL,
        metadata JSONB,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS travel_inventory (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(50) NOT NULL,
        provider VARCHAR(100) NOT NULL,
        data JSONB NOT NULL,
        cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
      CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
      CREATE INDEX IF NOT EXISTS idx_experiment_events_experiment_id ON experiment_events(experiment_id);
      CREATE INDEX IF NOT EXISTS idx_experiment_events_event_type ON experiment_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_experiment_events_variant ON experiment_events(variant);
      CREATE INDEX IF NOT EXISTS idx_experiment_events_timestamp ON experiment_events(timestamp);
    `);
    console.log('✅ PostgreSQL tables initialized');
  } catch (error) {
    console.error('❌ PostgreSQL init error:', error);
    throw error;
  } finally {
    if (client) client.release();
  }
};

export const seedDefaultExperiments = async (): Promise<void> => {
  let client: PoolClient | null = null;
  try {
    client = await pool.connect();
    const existing = await client.query('SELECT COUNT(*) FROM experiments');
    if (parseInt(existing.rows[0].count) > 0) return;

    await client.query(`
      INSERT INTO experiments (name, variants, start_date, status) VALUES
      ('checkout_button_color', '["control","variant_blue","variant_green"]'::jsonb, NOW(), 'active'),
      ('pricing_display_format', '["total_price","nightly_price"]'::jsonb, NOW(), 'active'),
      ('search_result_ranking', '["relevance","price_asc","rating_desc"]'::jsonb, NOW(), 'active')
      ON CONFLICT DO NOTHING;
    `);
    console.log('✅ Default experiments seeded');
  } catch (error) {
    console.error('⚠️  Could not seed experiments (table may not exist yet):', error);
  } finally {
    if (client) client.release();
  }
};
