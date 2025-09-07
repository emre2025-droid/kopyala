import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: ReturnType<typeof createClient<Database>> | null = null;
let isSupabaseAvailable = false;

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('ℹ️ Supabase environment variables not found - running in local mode');
  supabase = null;
  isSupabaseAvailable = false;
} else {
  try {
    supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
    isSupabaseAvailable = true;
    console.log('✅ Supabase client initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Supabase client:', error);
    supabase = null;
    isSupabaseAvailable = false;
  }
}

// Test Supabase connection
const testSupabaseConnection = async (): Promise<boolean> => {
  if (!supabase) return false;
  
  try {
    // Test connection without relying on specific tables
    const { error } = await supabase.auth.getSession();
    if (error) {
      console.log('ℹ️ Supabase connection failed - running in local mode');
      return false;
    }
    return true;
  } catch (error) {
    console.log('ℹ️ Supabase connection test failed - running in local mode');
    return false;
  }
};

// Initialize connection test
let connectionTestPromise: Promise<boolean> | null = null;
const checkSupabaseAvailability = async (): Promise<boolean> => {
  if (!connectionTestPromise) {
    connectionTestPromise = testSupabaseConnection();
  }
  return connectionTestPromise;
};

export { supabase };

// Database service functions with fallback to local storage
export class DatabaseService {
  private static async isAvailable(): Promise<boolean> {
    if (!isSupabaseAvailable) return false;
    return await checkSupabaseAvailability();
  }

  // Local storage fallback functions
  private static getLocalData<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private static setLocalData<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  // Cihaz işlemleri
  static async upsertDevice(deviceData: {
    id: string;
    display_name?: string | null;
    customer_id?: string | null;
    is_online: boolean;
    last_seen: string;
  }) {
    const available = await this.isAvailable();
    if (!available || !supabase) {
      // Local storage fallback
      const devices = this.getLocalData('devices', {});
      devices[deviceData.id] = deviceData;
      this.setLocalData('devices', devices);
      return;
    }
    
    try {
      const { error } = await supabase
        .from('devices')
        .upsert(deviceData, { onConflict: 'id' });
      
      if (error) throw error;
    } catch (error) {
      console.warn('Supabase upsert failed, using local storage:', error);
      const devices = this.getLocalData('devices', {});
      devices[deviceData.id] = deviceData;
      this.setLocalData('devices', devices);
    }
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
    const available = await this.isAvailable();
    if (!available || !supabase) {
      // Local storage fallback
      const telemetry = this.getLocalData('telemetry_data', []);
      telemetry.push({ ...data, id: Date.now().toString(), created_at: new Date().toISOString() });
      // Keep only last 1000 records
      if (telemetry.length > 1000) {
        telemetry.splice(0, telemetry.length - 1000);
      }
      this.setLocalData('telemetry_data', telemetry);
      return;
    }
    
    try {
      const { error } = await supabase
        .from('telemetry_data')
        .insert(data);
      
      if (error) throw error;
    } catch (error) {
      console.warn('Supabase telemetry insert failed, using local storage:', error);
      const telemetry = this.getLocalData('telemetry_data', []);
      telemetry.push({ ...data, id: Date.now().toString(), created_at: new Date().toISOString() });
      if (telemetry.length > 1000) {
        telemetry.splice(0, telemetry.length - 1000);
      }
      this.setLocalData('telemetry_data', telemetry);
    }
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
    const available = await this.isAvailable();
    if (!available || !supabase) {
      // Local storage fallback
      const statusData = this.getLocalData('status_data', []);
      statusData.push({ ...data, id: Date.now().toString(), created_at: new Date().toISOString() });
      // Keep only last 1000 records
      if (statusData.length > 1000) {
        statusData.splice(0, statusData.length - 1000);
      }
      this.setLocalData('status_data', statusData);
      return;
    }
    
    try {
      const { error } = await supabase
        .from('status_data')
        .insert(data);
      
      if (error) throw error;
    } catch (error) {
      console.warn('Supabase status insert failed, using local storage:', error);
      const statusData = this.getLocalData('status_data', []);
      statusData.push({ ...data, id: Date.now().toString(), created_at: new Date().toISOString() });
      if (statusData.length > 1000) {
        statusData.splice(0, statusData.length - 1000);
      }
      this.setLocalData('status_data', statusData);
    }
  }

  // MQTT mesajı kaydetme
  static async insertMqttMessage(data: {
    device_id: string;
    topic: string;
    payload: string;
    timestamp?: string;
  }) {
    const available = await this.isAvailable();
    if (!available || !supabase) {
      // Local storage fallback
      const messages = this.getLocalData('mqtt_messages', []);
      messages.push({ ...data, id: Date.now().toString(), created_at: new Date().toISOString() });
      // Keep only last 500 records per device
      const deviceMessages = messages.filter(m => m.device_id === data.device_id);
      if (deviceMessages.length > 500) {
        const otherMessages = messages.filter(m => m.device_id !== data.device_id);
        const recentDeviceMessages = deviceMessages.slice(-500);
        this.setLocalData('mqtt_messages', [...otherMessages, ...recentDeviceMessages]);
      } else {
        this.setLocalData('mqtt_messages', messages);
      }
      return;
    }
    
    try {
      const { error } = await supabase
        .from('mqtt_messages')
        .insert(data);
      
      if (error) throw error;
    } catch (error) {
      console.warn('Supabase message insert failed, using local storage:', error);
      const messages = this.getLocalData('mqtt_messages', []);
      messages.push({ ...data, id: Date.now().toString(), created_at: new Date().toISOString() });
      const deviceMessages = messages.filter(m => m.device_id === data.device_id);
      if (deviceMessages.length > 500) {
        const otherMessages = messages.filter(m => m.device_id !== data.device_id);
        const recentDeviceMessages = deviceMessages.slice(-500);
        this.setLocalData('mqtt_messages', [...otherMessages, ...recentDeviceMessages]);
      } else {
        this.setLocalData('mqtt_messages', messages);
      }
    }
  }

  // Müşteri işlemleri
  static async getCustomers() {
    const available = await this.isAvailable();
    if (!available || !supabase) {
      // Local storage fallback
      const customers = this.getLocalData('customers', [
        { id: 'demo-hotel', name: 'Demo Otel' },
        { id: 'test-restaurant', name: 'Test Restoran' },
        { id: 'sample-factory', name: 'Örnek Fabrika' }
      ]);
      return customers;
    }
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.warn('Supabase customers fetch failed, using local storage:', error);
      return this.getLocalData('customers', [
        { id: 'demo-hotel', name: 'Demo Otel' },
        { id: 'test-restaurant', name: 'Test Restoran' },
        { id: 'sample-factory', name: 'Örnek Fabrika' }
      ]);
    }
  }

  static async createCustomer(name: string) {
    const available = await this.isAvailable();
    if (!available || !supabase) {
      // Local storage fallback
      const customers = this.getLocalData('customers', []);
      const newCustomer = { id: `customer-${Date.now()}`, name };
      customers.push(newCustomer);
      this.setLocalData('customers', customers);
      return newCustomer;
    }
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({ name })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.warn('Supabase customer create failed, using local storage:', error);
      const customers = this.getLocalData('customers', []);
      const newCustomer = { id: `customer-${Date.now()}`, name };
      customers.push(newCustomer);
      this.setLocalData('customers', customers);
      return newCustomer;
    }
  }

  static async deleteCustomer(customerId: string) {
    const available = await this.isAvailable();
    if (!available || !supabase) {
      // Local storage fallback
      const customers = this.getLocalData('customers', []);
      const filtered = customers.filter(c => c.id !== customerId);
      this.setLocalData('customers', filtered);
      return;
    }
    
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);
      
      if (error) throw error;
    } catch (error) {
      console.warn('Supabase customer delete failed, using local storage:', error);
      const customers = this.getLocalData('customers', []);
      const filtered = customers.filter(c => c.id !== customerId);
      this.setLocalData('customers', filtered);
    }
  }

  // Cihaz işlemleri
  static async getDevices() {
    const available = await this.isAvailable();
    if (!available || !supabase) {
      // Local storage fallback
      const devices = this.getLocalData('devices', {});
      return Object.values(devices).map(device => ({
        ...device,
        customer: null // Local storage doesn't have customer join
      }));
    }
    
    try {
      const { data, error } = await supabase
        .from('devices')
        .select(`
          *,
          customer:customers(*)
        `)
        .order('id');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.warn('Supabase devices fetch failed, using local storage:', error);
      const devices = this.getLocalData('devices', {});
      return Object.values(devices).map(device => ({
        ...device,
        customer: null
      }));
    }
  }

  static async updateDeviceCustomer(deviceId: string, customerId: string | null) {
    const available = await this.isAvailable();
    if (!available || !supabase) {
      // Local storage fallback
      const devices = this.getLocalData('devices', {});
      if (devices[deviceId]) {
        devices[deviceId].customer_id = customerId;
        this.setLocalData('devices', devices);
      }
      return;
    }
    
    try {
      const { error } = await supabase
        .from('devices')
        .update({ customer_id: customerId })
        .eq('id', deviceId);
      
      if (error) throw error;
    } catch (error) {
      console.warn('Supabase device customer update failed, using local storage:', error);
      const devices = this.getLocalData('devices', {});
      if (devices[deviceId]) {
        devices[deviceId].customer_id = customerId;
        this.setLocalData('devices', devices);
      }
    }
  }

  static async updateDeviceName(deviceId: string, displayName: string) {
    const available = await this.isAvailable();
    if (!available || !supabase) {
      // Local storage fallback
      const devices = this.getLocalData('devices', {});
      if (devices[deviceId]) {
        devices[deviceId].display_name = displayName;
        this.setLocalData('devices', devices);
      }
      return;
    }
    
    try {
      const { error } = await supabase
        .from('devices')
        .update({ display_name: displayName })
        .eq('id', deviceId);
      
      if (error) throw error;
    } catch (error) {
      console.warn('Supabase device name update failed, using local storage:', error);
      const devices = this.getLocalData('devices', {});
      if (devices[deviceId]) {
        devices[deviceId].display_name = displayName;
        this.setLocalData('devices', devices);
      }
    }
  }

  // Telemetri verilerini getirme
  static async getTelemetryData(deviceId: string, limit = 100) {
    const available = await this.isAvailable();
    if (!available || !supabase) {
      // Local storage fallback
      const telemetry = this.getLocalData('telemetry_data', []);
      return telemetry
        .filter(t => t.device_id === deviceId)
        .sort((a, b) => new Date(b.timestamp || b.created_at).getTime() - new Date(a.timestamp || a.created_at).getTime())
        .slice(0, limit);
    }
    
    try {
      const { data, error } = await supabase
        .from('telemetry_data')
        .select('*')
        .eq('device_id', deviceId)
        .order('timestamp', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.warn('Supabase telemetry fetch failed, using local storage:', error);
      const telemetry = this.getLocalData('telemetry_data', []);
      return telemetry
        .filter(t => t.device_id === deviceId)
        .sort((a, b) => new Date(b.timestamp || b.created_at).getTime() - new Date(a.timestamp || a.created_at).getTime())
        .slice(0, limit);
    }
  }

  // MQTT mesajlarını getirme
  static async getMqttMessages(deviceId: string, limit = 500) {
    const available = await this.isAvailable();
    if (!available || !supabase) {
      // Local storage fallback
      const messages = this.getLocalData('mqtt_messages', []);
      return messages
        .filter(m => m.device_id === deviceId)
        .sort((a, b) => new Date(b.timestamp || b.created_at).getTime() - new Date(a.timestamp || a.created_at).getTime())
        .slice(0, limit);
    }
    
    try {
      const { data, error } = await supabase
        .from('mqtt_messages')
        .select('*')
        .eq('device_id', deviceId)
        .order('timestamp', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.warn('Supabase messages fetch failed, using local storage:', error);
      const messages = this.getLocalData('mqtt_messages', []);
      return messages
        .filter(m => m.device_id === deviceId)
        .sort((a, b) => new Date(b.timestamp || b.created_at).getTime() - new Date(a.timestamp || a.created_at).getTime())
        .slice(0, limit);
    }
  }
}