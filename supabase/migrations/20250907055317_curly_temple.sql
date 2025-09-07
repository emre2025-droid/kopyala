/*
  # Complete ALS Control Panel Database Schema

  1. New Tables
    - `customers` - Customer management
      - `id` (uuid, primary key)
      - `name` (text, unique customer name)
      - `created_at` (timestamp)
    
    - `devices` - Device management
      - `id` (text, primary key, device ID from MQTT)
      - `display_name` (text, optional friendly name)
      - `customer_id` (uuid, foreign key to customers)
      - `is_online` (boolean, current online status)
      - `last_seen` (timestamp, last activity)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `telemetry_data` - Device telemetry readings
      - `id` (uuid, primary key)
      - `device_id` (text, foreign key to devices)
      - `tds` (numeric, water quality)
      - `temp` (numeric, temperature)
      - `flow_clean` (numeric, clean water flow)
      - `flow_waste` (numeric, waste water flow)
      - `total_clean_litres` (numeric, total clean water)
      - `total_waste_litres` (numeric, total waste water)
      - `fw` (text, firmware version)
      - `timestamp` (timestamp, data timestamp)
      - `created_at` (timestamp)
    
    - `status_data` - Device status information
      - `id` (uuid, primary key)
      - `device_id` (text, foreign key to devices)
      - `event` (text, status event)
      - `fw` (text, firmware version)
      - `ip` (text, IP address)
      - `rssi` (integer, signal strength)
      - `uptime_ms` (bigint, uptime in milliseconds)
      - `interval_ms` (integer, reporting interval)
      - `status` (text, device status)
      - `timestamp` (timestamp, status timestamp)
      - `created_at` (timestamp)
    
    - `mqtt_messages` - Raw MQTT message log
      - `id` (uuid, primary key)
      - `device_id` (text, foreign key to devices)
      - `topic` (text, MQTT topic)
      - `payload` (text, message payload)
      - `timestamp` (timestamp, message timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their data
    - Add policies for public read access where appropriate

  3. Indexes
    - Add indexes for frequently queried columns
    - Add composite indexes for common query patterns
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create devices table
CREATE TABLE IF NOT EXISTS devices (
  id text PRIMARY KEY,
  display_name text,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  is_online boolean DEFAULT false,
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create telemetry_data table
CREATE TABLE IF NOT EXISTS telemetry_data (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id text NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  tds numeric,
  temp numeric,
  flow_clean numeric,
  flow_waste numeric,
  total_clean_litres numeric,
  total_waste_litres numeric,
  fw text,
  timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create status_data table
CREATE TABLE IF NOT EXISTS status_data (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id text NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  event text,
  fw text,
  ip text,
  rssi integer,
  uptime_ms bigint,
  interval_ms integer,
  status text,
  timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create mqtt_messages table
CREATE TABLE IF NOT EXISTS mqtt_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id text NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  topic text NOT NULL,
  payload text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_devices_customer_id ON devices(customer_id);
CREATE INDEX IF NOT EXISTS idx_devices_is_online ON devices(is_online);
CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices(last_seen);

CREATE INDEX IF NOT EXISTS idx_telemetry_device_id ON telemetry_data(device_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON telemetry_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_telemetry_device_timestamp ON telemetry_data(device_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_status_device_id ON status_data(device_id);
CREATE INDEX IF NOT EXISTS idx_status_timestamp ON status_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_status_device_timestamp ON status_data(device_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_mqtt_device_id ON mqtt_messages(device_id);
CREATE INDEX IF NOT EXISTS idx_mqtt_timestamp ON mqtt_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_mqtt_device_timestamp ON mqtt_messages(device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_mqtt_topic ON mqtt_messages(topic);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for devices table
DROP TRIGGER IF EXISTS update_devices_updated_at ON devices;
CREATE TRIGGER update_devices_updated_at
    BEFORE UPDATE ON devices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE mqtt_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since we're using anon key)
-- In production, you might want to restrict these based on authentication

-- Customers policies
CREATE POLICY "Allow all operations on customers" ON customers
  FOR ALL USING (true) WITH CHECK (true);

-- Devices policies
CREATE POLICY "Allow all operations on devices" ON devices
  FOR ALL USING (true) WITH CHECK (true);

-- Telemetry data policies
CREATE POLICY "Allow all operations on telemetry_data" ON telemetry_data
  FOR ALL USING (true) WITH CHECK (true);

-- Status data policies
CREATE POLICY "Allow all operations on status_data" ON status_data
  FOR ALL USING (true) WITH CHECK (true);

-- MQTT messages policies
CREATE POLICY "Allow all operations on mqtt_messages" ON mqtt_messages
  FOR ALL USING (true) WITH CHECK (true);

-- Insert some sample data
INSERT INTO customers (name) VALUES 
  ('Demo Otel'),
  ('Test Restoran'),
  ('Örnek Fabrika')
ON CONFLICT (name) DO NOTHING;