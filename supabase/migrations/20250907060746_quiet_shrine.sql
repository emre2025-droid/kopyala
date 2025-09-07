/*
  # Complete Supabase Database Setup

  This SQL script creates all necessary tables, indexes, RLS policies, and sample data
  for the MQTT IoT Dashboard application.

  ## Instructions:
  1. Go to your Supabase project dashboard
  2. Navigate to SQL Editor
  3. Copy and paste this entire SQL script
  4. Click "RUN" to execute

  ## What this creates:
  1. All required tables (customers, devices, telemetry_data, status_data, mqtt_messages)
  2. Proper indexes for performance
  3. Row Level Security (RLS) policies
  4. Sample customer data
  5. Triggers for automatic timestamp updates
*/

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create devices table
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  display_name TEXT,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create telemetry_data table
CREATE TABLE IF NOT EXISTS telemetry_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  tds NUMERIC,
  temp NUMERIC,
  flow_clean NUMERIC,
  flow_waste NUMERIC,
  total_clean_litres NUMERIC,
  total_waste_litres NUMERIC,
  fw TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create status_data table
CREATE TABLE IF NOT EXISTS status_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  event TEXT,
  fw TEXT,
  ip TEXT,
  rssi INTEGER,
  uptime_ms BIGINT,
  interval_ms INTEGER,
  status TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create mqtt_messages table
CREATE TABLE IF NOT EXISTS mqtt_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  payload TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_devices_customer_id ON devices(customer_id);
CREATE INDEX IF NOT EXISTS idx_devices_is_online ON devices(is_online);
CREATE INDEX IF NOT EXISTS idx_telemetry_device_id ON telemetry_data(device_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON telemetry_data(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_status_device_id ON status_data(device_id);
CREATE INDEX IF NOT EXISTS idx_status_timestamp ON status_data(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_mqtt_device_id ON mqtt_messages(device_id);
CREATE INDEX IF NOT EXISTS idx_mqtt_timestamp ON mqtt_messages(timestamp DESC);

-- Enable RLS on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE mqtt_messages ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (for now)
DROP POLICY IF EXISTS "Allow all operations on customers" ON customers;
CREATE POLICY "Allow all operations on customers" ON customers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on devices" ON devices;
CREATE POLICY "Allow all operations on devices" ON devices FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on telemetry_data" ON telemetry_data;
CREATE POLICY "Allow all operations on telemetry_data" ON telemetry_data FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on status_data" ON status_data;
CREATE POLICY "Allow all operations on status_data" ON status_data FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on mqtt_messages" ON mqtt_messages;
CREATE POLICY "Allow all operations on mqtt_messages" ON mqtt_messages FOR ALL USING (true) WITH CHECK (true);

-- Insert sample customers if they don't exist
INSERT INTO customers (id, name) VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'Demo Otel'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Test Restoran'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Örnek Fabrika')
ON CONFLICT (id) DO NOTHING;

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_devices_updated_at ON devices;
CREATE TRIGGER update_devices_updated_at
  BEFORE UPDATE ON devices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();