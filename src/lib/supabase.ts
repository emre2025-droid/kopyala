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
    
    // Test if tables exist by trying to query them
    const { error: testError } = await supabase
      .from('customers')
      .select('count', { count: 'exact', head: true })
      .limit(1);

    if (testError && testError.code === 'PGRST116') {
      // Tables don't exist, show instructions to user
      console.warn('⚠️ Supabase tables not found. Please create them manually.');
      console.warn('📋 Go to your Supabase SQL Editor and run the SQL from create_tables.sql');
      return false;
    }

    if (testError) {
      console.error('❌ Database connection error:', testError);
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
    const isSetup = await this.ensureSetup();
    if (!isSetup) {
      console.warn('⚠️ Database not available, returning empty customers list');
      return [];
    }
    
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name');
    
    if (error) {
      console.warn('⚠️ Failed to fetch customers:', error.message);
      return [];
    }
    return data || [];
  }

  static async createCustomer(name: string) {
    const isSetup = await this.ensureSetup();
    if (!isSetup) throw new Error('Database not available');
    
    const { data, error } = await supabase
      .from('customers')
      .insert({ name })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async deleteCustomer(customerId: string) {
    const isSetup = await this.ensureSetup();
    if (!isSetup) throw new Error('Database not available');
    
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId);
    
    if (error) throw error;
  }

  // Device operations
  static async getDevices() {
    const isSetup = await this.ensureSetup();
    if (!isSetup) {
      console.warn('⚠️ Database not available, returning empty devices list');
      return [];
    }
    
    const { data, error } = await supabase
      .from('devices')
      .select(`
        *,
        customer:customers(*)
      `)
      .order('id');
    
    if (error) {
      console.warn('⚠️ Failed to fetch devices:', error.message);
      return [];
    }
    return data || [];
  }

  static async upsertDevice(deviceData: {
    id: string;
    display_name?: string | null;
    customer_id?: string | null;
    is_online: boolean;
    last_seen: string;
  }) {
    const isSetup = await this.ensureSetup();
    if (!isSetup) return;
    
    const { error } = await supabase
      .from('devices')
      .upsert(deviceData, { onConflict: 'id' });
    
    if (error) {
      console.warn('⚠️ Failed to upsert device:', error.message);
    }
  }

  static async updateDeviceCustomer(deviceId: string, customerId: string | null) {
    const isSetup = await this.ensureSetup();
    if (!isSetup) throw new Error('Database not available');
    
    const { error } = await supabase
      .from('devices')
      .update({ customer_id: customerId })
      .eq('id', deviceId);
    
    if (error) throw error;
  }

  static async updateDeviceName(deviceId: string, displayName: string) {
    const isSetup = await this.ensureSetup();
    if (!isSetup) throw new Error('Database not available');
    
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
    const isSetup = await this.ensureSetup();
    if (!isSetup) return;
    
    const { error } = await supabase
      .from('telemetry_data')
      .insert(data);
    
    if (error) {
      console.warn('⚠️ Failed to insert telemetry data:', error.message);
    }
  }

  static async getTelemetryData(deviceId: string, limit = 100) {
    const isSetup = await this.ensureSetup();
    if (!isSetup) return [];
    
    const { data, error } = await supabase
      .from('telemetry_data')
      .select('*')
      .eq('device_id', deviceId)
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.warn('⚠️ Failed to fetch telemetry data:', error.message);
      return [];
    }
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
    const isSetup = await this.ensureSetup();
    if (!isSetup) return;
    
    const { error } = await supabase
      .from('status_data')
      .insert(data);
    
    if (error) {
      console.warn('⚠️ Failed to insert status data:', error.message);
    }
  }

  // MQTT message operations
  static async insertMqttMessage(data: {
    device_id: string;
    topic: string;
    payload: string;
    timestamp?: string;
  }) {
    const isSetup = await this.ensureSetup();
    if (!isSetup) return;
    
    const { error } = await supabase
      .from('mqtt_messages')
      .insert(data);
    
    if (error) {
      console.warn('⚠️ Failed to insert MQTT message:', error.message);
    }
  }

  static async getMqttMessages(deviceId: string, limit = 500) {
    const isSetup = await this.ensureSetup();
    if (!isSetup) return [];
    
    const { data, error } = await supabase
      .from('mqtt_messages')
      .select('*')
      .eq('device_id', deviceId)
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.warn('⚠️ Failed to fetch MQTT messages:', error.message);
      return [];
    }
    return data || [];
  }
}