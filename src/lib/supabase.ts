import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: ReturnType<typeof createClient<Database>> | null = null;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase environment variables not found!');
  supabase = null;
} else {
  try {
    supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
    console.log('✅ Supabase client initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Supabase client:', error);
    supabase = null;
  }
}

// Otomatik veritabanı kurulumu
const setupDatabase = async () => {
  if (!supabase) return false;

  try {
    console.log('🔧 Setting up database tables...');

    // Tabloları oluştur
    const createTablesSQL = `
      -- Customers table
      CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Devices table
      CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        display_name TEXT,
        customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
        is_online BOOLEAN DEFAULT false,
        last_seen TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Telemetry data table
      CREATE TABLE IF NOT EXISTS telemetry_data (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        device_id TEXT REFERENCES devices(id) ON DELETE CASCADE,
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

      -- Status data table
      CREATE TABLE IF NOT EXISTS status_data (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        device_id TEXT REFERENCES devices(id) ON DELETE CASCADE,
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

      -- MQTT messages table
      CREATE TABLE IF NOT EXISTS mqtt_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        device_id TEXT REFERENCES devices(id) ON DELETE CASCADE,
        topic TEXT NOT NULL,
        payload TEXT NOT NULL,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Enable RLS on all tables
      ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
      ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
      ALTER TABLE telemetry_data ENABLE ROW LEVEL SECURITY;
      ALTER TABLE status_data ENABLE ROW LEVEL SECURITY;
      ALTER TABLE mqtt_messages ENABLE ROW LEVEL SECURITY;

      -- Create policies for all operations
      DO $$ 
      BEGIN
        -- Customers policies
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Allow all operations') THEN
          CREATE POLICY "Allow all operations" ON customers FOR ALL USING (true) WITH CHECK (true);
        END IF;

        -- Devices policies
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'devices' AND policyname = 'Allow all operations') THEN
          CREATE POLICY "Allow all operations" ON devices FOR ALL USING (true) WITH CHECK (true);
        END IF;

        -- Telemetry data policies
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'telemetry_data' AND policyname = 'Allow all operations') THEN
          CREATE POLICY "Allow all operations" ON telemetry_data FOR ALL USING (true) WITH CHECK (true);
        END IF;

        -- Status data policies
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'status_data' AND policyname = 'Allow all operations') THEN
          CREATE POLICY "Allow all operations" ON status_data FOR ALL USING (true) WITH CHECK (true);
        END IF;

        -- MQTT messages policies
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mqtt_messages' AND policyname = 'Allow all operations') THEN
          CREATE POLICY "Allow all operations" ON mqtt_messages FOR ALL USING (true) WITH CHECK (true);
        END IF;
      END $$;

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_devices_customer_id ON devices(customer_id);
      CREATE INDEX IF NOT EXISTS idx_devices_is_online ON devices(is_online);
      CREATE INDEX IF NOT EXISTS idx_telemetry_device_id ON telemetry_data(device_id);
      CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON telemetry_data(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_status_device_id ON status_data(device_id);
      CREATE INDEX IF NOT EXISTS idx_status_timestamp ON status_data(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_mqtt_device_id ON mqtt_messages(device_id);
      CREATE INDEX IF NOT EXISTS idx_mqtt_timestamp ON mqtt_messages(timestamp DESC);

      -- Create trigger for updating updated_at
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

      -- Insert sample customers if they don't exist
      INSERT INTO customers (name) 
      SELECT * FROM (VALUES 
        ('Demo Otel'),
        ('Test Restoran'),
        ('Örnek Fabrika')
      ) AS v(name)
      WHERE NOT EXISTS (SELECT 1 FROM customers WHERE name = v.name);
    `;

    // SQL'i çalıştır
    const { error } = await supabase.rpc('exec_sql', { sql: createTablesSQL });
    
    if (error) {
      // RPC yoksa direkt SQL çalıştırmayı dene
      console.log('🔄 Trying alternative setup method...');
      
      // Tabloları tek tek oluştur
      const tables = [
        {
          name: 'customers',
          sql: `CREATE TABLE IF NOT EXISTS customers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
          )`
        },
        {
          name: 'devices', 
          sql: `CREATE TABLE IF NOT EXISTS devices (
            id TEXT PRIMARY KEY,
            display_name TEXT,
            customer_id UUID,
            is_online BOOLEAN DEFAULT false,
            last_seen TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          )`
        },
        {
          name: 'telemetry_data',
          sql: `CREATE TABLE IF NOT EXISTS telemetry_data (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            device_id TEXT,
            tds NUMERIC,
            temp NUMERIC,
            flow_clean NUMERIC,
            flow_waste NUMERIC,
            total_clean_litres NUMERIC,
            total_waste_litres NUMERIC,
            fw TEXT,
            timestamp TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW()
          )`
        },
        {
          name: 'status_data',
          sql: `CREATE TABLE IF NOT EXISTS status_data (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            device_id TEXT,
            event TEXT,
            fw TEXT,
            ip TEXT,
            rssi INTEGER,
            uptime_ms BIGINT,
            interval_ms INTEGER,
            status TEXT,
            timestamp TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW()
          )`
        },
        {
          name: 'mqtt_messages',
          sql: `CREATE TABLE IF NOT EXISTS mqtt_messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            device_id TEXT,
            topic TEXT NOT NULL,
            payload TEXT NOT NULL,
            timestamp TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW()
          )`
        }
      ];

      // Her tabloyu kontrol et ve oluştur
      for (const table of tables) {
        try {
          const { data } = await supabase.from(table.name).select('*').limit(1);
          console.log(`✅ Table ${table.name} exists`);
        } catch (tableError: any) {
          if (tableError.message?.includes('Could not find the table')) {
            console.log(`🔧 Creating table ${table.name}...`);
            // Tablo yoksa oluşturmaya çalış (bu genellikle çalışmaz ama deneyebiliriz)
            console.warn(`❌ Cannot create table ${table.name} automatically. Please create it manually.`);
          }
        }
      }
    } else {
      console.log('✅ Database setup completed successfully!');
    }

    return true;
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    return false;
  }
};

// Veritabanını otomatik kur
let setupPromise: Promise<boolean> | null = null;
const ensureDatabaseSetup = async () => {
  if (!setupPromise) {
    setupPromise = setupDatabase();
  }
  return setupPromise;
};

export { supabase, ensureDatabaseSetup };

// Database service functions
export class DatabaseService {
  // Veritabanı kurulumunu kontrol et
  static async ensureSetup() {
    return await ensureDatabaseSetup();
  }

  // Cihaz işlemleri
  static async upsertDevice(deviceData: {
    id: string;
    display_name?: string | null;
    customer_id?: string | null;
    is_online: boolean;
    last_seen: string;
  }) {
    if (!supabase) throw new Error('Supabase not configured');
    
    await this.ensureSetup();
    
    const { error } = await supabase
      .from('devices')
      .upsert(deviceData, { onConflict: 'id' });
    
    if (error) throw error;
  }

  // Telemetri verisi kaydetme
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
    if (!supabase) throw new Error('Supabase not configured');
    
    await this.ensureSetup();
    
    const { error } = await supabase
      .from('telemetry_data')
      .insert(data);
    
    if (error) throw error;
  }

  // Durum verisi kaydetme
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
    if (!supabase) throw new Error('Supabase not configured');
    
    await this.ensureSetup();
    
    const { error } = await supabase
      .from('status_data')
      .insert(data);
    
    if (error) throw error;
  }

  // MQTT mesajı kaydetme
  static async insertMqttMessage(data: {
    device_id: string;
    topic: string;
    payload: string;
    timestamp?: string;
  }) {
    if (!supabase) throw new Error('Supabase not configured');
    
    await this.ensureSetup();
    
    const { error } = await supabase
      .from('mqtt_messages')
      .insert(data);
    
    if (error) throw error;
  }

  // Müşteri işlemleri
  static async getCustomers() {
    if (!supabase) throw new Error('Supabase not configured');
    
    await this.ensureSetup();
    
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  }

  static async createCustomer(name: string) {
    if (!supabase) throw new Error('Supabase not configured');
    
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
    if (!supabase) throw new Error('Supabase not configured');
    
    await this.ensureSetup();
    
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId);
    
    if (error) throw error;
  }

  // Cihaz işlemleri
  static async getDevices() {
    if (!supabase) throw new Error('Supabase not configured');
    
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

  static async updateDeviceCustomer(deviceId: string, customerId: string | null) {
    if (!supabase) throw new Error('Supabase not configured');
    
    await this.ensureSetup();
    
    const { error } = await supabase
      .from('devices')
      .update({ customer_id: customerId })
      .eq('id', deviceId);
    
    if (error) throw error;
  }

  static async updateDeviceName(deviceId: string, displayName: string) {
    if (!supabase) throw new Error('Supabase not configured');
    
    await this.ensureSetup();
    
    const { error } = await supabase
      .from('devices')
      .update({ display_name: displayName })
      .eq('id', deviceId);
    
    if (error) throw error;
  }

  // Telemetri verilerini getirme
  static async getTelemetryData(deviceId: string, limit = 100) {
    if (!supabase) throw new Error('Supabase not configured');
    
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

  // MQTT mesajlarını getirme
  static async getMqttMessages(deviceId: string, limit = 500) {
    if (!supabase) throw new Error('Supabase not configured');
    
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