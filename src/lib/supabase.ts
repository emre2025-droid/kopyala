import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: ReturnType<typeof createClient<Database>> | null;

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'your_supabase_project_url_here' || supabaseAnonKey === 'your_supabase_anon_key_here') {
  console.warn('Supabase environment variables not configured. Using fallback mode.');
  // Create a dummy client that will fail gracefully
  supabase = null;
} else {
  supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
}

export { supabase };

// Database service functions
export class DatabaseService {
  // Cihaz işlemleri
  static async upsertDevice(deviceData: {
    id: string;
    display_name?: string;
    customer_id?: string;
    is_online: boolean;
    last_seen: string;
  }) {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    
    const { error } = await supabase
      .from('devices')
      .upsert(deviceData, { onConflict: 'id' });
    
    if (error) {
      console.error('Error upserting device:', error);
      throw error;
    }
  }

  // Telemetri verisi kaydetme
  static async insertTelemetryData(data: {
    device_id: string;
    tds?: number;
    temp?: number;
    flow_clean?: number;
    flow_waste?: number;
    total_clean_litres?: number;
    total_waste_litres?: number;
    fw?: string;
    timestamp?: string;
  }) {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    
    const { error } = await supabase
      .from('telemetry_data')
      .insert(data);
    
    if (error) {
      console.error('Error inserting telemetry data:', error);
      throw error;
    }
  }

  // Durum verisi kaydetme
  static async insertStatusData(data: {
    device_id: string;
    event?: string;
    fw?: string;
    ip?: string;
    rssi?: number;
    uptime_ms?: number;
    interval_ms?: number;
    status?: string;
    timestamp?: string;
  }) {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    
    const { error } = await supabase
      .from('status_data')
      .insert(data);
    
    if (error) {
      console.error('Error inserting status data:', error);
      throw error;
    }
  }

  // MQTT mesajı kaydetme
  static async insertMqttMessage(data: {
    device_id: string;
    topic: string;
    payload: string;
    timestamp?: string;
  }) {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    
    const { error } = await supabase
      .from('mqtt_messages')
      .insert(data);
    
    if (error) {
      console.error('Error inserting MQTT message:', error);
      throw error;
    }
  }

  // Müşteri işlemleri
  static async getCustomers() {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }
    
    return data || [];
  }

  static async createCustomer(name: string) {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    
    const { data, error } = await supabase
      .from('customers')
      .insert({ name })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
    
    return data;
  }

  static async deleteCustomer(customerId: string) {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId);
    
    if (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  }

  // Cihaz işlemleri
  static async getDevices() {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    
    const { data, error } = await supabase
      .from('devices')
      .select(`
        *,
        customer:customers(*)
      `)
      .order('id');
    
    if (error) {
      console.error('Error fetching devices:', error);
      throw error;
    }
    
    return data || [];
  }

  static async updateDeviceCustomer(deviceId: string, customerId: string | null) {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    
    const { error } = await supabase
      .from('devices')
      .update({ customer_id: customerId })
      .eq('id', deviceId);
    
    if (error) {
      console.error('Error updating device customer:', error);
      throw error;
    }
  }

  static async updateDeviceName(deviceId: string, displayName: string) {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    
    const { error } = await supabase
      .from('devices')
      .update({ display_name: displayName })
      .eq('id', deviceId);
    
    if (error) {
      console.error('Error updating device name:', error);
      throw error;
    }
  }

  // Telemetri verilerini getirme
  static async getTelemetryData(deviceId: string, limit = 100) {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    
    const { data, error } = await supabase
      .from('telemetry_data')
      .select('*')
      .eq('device_id', deviceId)
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching telemetry data:', error);
      throw error;
    }
    
    return data || [];
  }

  // MQTT mesajlarını getirme
  static async getMqttMessages(deviceId: string, limit = 500) {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    
    const { data, error } = await supabase
      .from('mqtt_messages')
      .select('*')
      .eq('device_id', deviceId)
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching MQTT messages:', error);
      throw error;
    }
    
    return data || [];
  }
}