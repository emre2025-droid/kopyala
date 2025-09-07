import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase environment variables are required');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Database setup - creates all tables if they don't exist
const setupDatabase = async (): Promise<boolean> => {
  try {
    console.log('🔧 Setting up Supabase database...');
    
    // Create all tables with a single SQL command
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });

    if (error) {
      console.error('❌ Database setup failed:', error);
      return false;
    }

    console.log('✅ Database setup completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Database setup error:', error);
    return false;
  }
};

// Initialize database setup
let setupPromise: Promise<boolean> | null = null;
const ensureDatabaseSetup = async (): Promise<boolean> => {
  if (!setupPromise) {
    setupPromise = setupDatabase();
  }
  return setupPromise;
};

// Database service functions
export class DatabaseService {
  private static async ensureSetup(): Promise<boolean> {
    return await ensureDatabaseSetup();
  }

  // Customer operations
  static async getCustomers() {
    await this.ensureSetup();
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  }

  static async createCustomer(name: string) {
    await this.ensureSetup();
    const { data, error } = await supabase
      .from('customers')
      .insert({ name })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async deleteCustomer(customerId: string) {
    await this.ensureSetup();
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId);
    
    if (error) throw error;
  }

  // Device operations
  static async getDevices() {
    await this.ensureSetup();
    const { data, error } = await supabase
      .from('devices')
      .select(`
        *,
        customer:customers(*)
      `)
      .order('id');
    
    if (error) throw error;
    return data || [];
  }

  static async upsertDevice(deviceData: {
    id: string;
    display_name?: string | null;
    customer_id?: string | null;
    is_online: boolean;
    last_seen: string;
  }) {
    await this.ensureSetup();
    const { error } = await supabase
      .from('devices')
      .upsert(deviceData, { onConflict: 'id' });
    
    if (error) throw error;
  }

  static async updateDeviceCustomer(deviceId: string, customerId: string | null) {
    await this.ensureSetup();
    const { error } = await supabase
      .from('devices')
      .update({ customer_id: customerId })
      .eq('id', deviceId);
    
    if (error) throw error;
  }

  static async updateDeviceName(deviceId: string, displayName: string) {
    await this.ensureSetup();
    const { error } = await supabase
      .from('devices')
      .update({ display_name: displayName })
      .eq('id', deviceId);
    
    if (error) throw error;
  }

  // Telemetry operations
  static async insertTelemetryData(data: {
    device_id: string;
    tds?: number | null;
    temp?: number | null;
    flow_clean?: number | null;
    flow_waste?: number | null;
    total_clean_litres?: number | null;
    total_waste_litres?: number | null;
    fw?: string | null;
    timestamp?: string;
  }) {
    await this.ensureSetup();
    const { error } = await supabase
      .from('telemetry_data')
      .insert(data);
    
    if (error) throw error;
  }

  static async getTelemetryData(deviceId: string, limit = 100) {
    await this.ensureSetup();
    const { data, error } = await supabase
      .from('telemetry_data')
      .select('*')
      .eq('device_id', deviceId)
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  }

  // Status operations
  static async insertStatusData(data: {
    device_id: string;
    event?: string | null;
    fw?: string | null;
    ip?: string | null;
    rssi?: number | null;
    uptime_ms?: number | null;
    interval_ms?: number | null;
    status?: string | null;
    timestamp?: string;
  }) {
    await this.ensureSetup();
    const { error } = await supabase
      .from('status_data')
      .insert(data);
    
    if (error) throw error;
  }

  // MQTT message operations
  static async insertMqttMessage(data: {
    device_id: string;
    topic: string;
    payload: string;
    timestamp?: string;
  }) {
    await this.ensureSetup();
    const { error } = await supabase
      .from('mqtt_messages')
      .insert(data);
    
    if (error) throw error;
  }

  static async getMqttMessages(deviceId: string, limit = 500) {
    await this.ensureSetup();
    const { data, error } = await supabase
      .from('mqtt_messages')
      .select('*')
      .eq('device_id', deviceId)
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  }
}