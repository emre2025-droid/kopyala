export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      devices: {
        Row: {
          id: string
          display_name: string | null
          customer_id: string | null
          is_online: boolean
          last_seen: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          customer_id?: string | null
          is_online?: boolean
          last_seen?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          customer_id?: string | null
          is_online?: boolean
          last_seen?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          }
        ]
      }
      telemetry_data: {
        Row: {
          id: string
          device_id: string
          tds: number | null
          temp: number | null
          flow_clean: number | null
          flow_waste: number | null
          total_clean_litres: number | null
          total_waste_litres: number | null
          fw: string | null
          timestamp: string
          created_at: string
        }
        Insert: {
          id?: string
          device_id: string
          tds?: number | null
          temp?: number | null
          flow_clean?: number | null
          flow_waste?: number | null
          total_clean_litres?: number | null
          total_waste_litres?: number | null
          fw?: string | null
          timestamp?: string
          created_at?: string
        }
        Update: {
          id?: string
          device_id?: string
          tds?: number | null
          temp?: number | null
          flow_clean?: number | null
          flow_waste?: number | null
          total_clean_litres?: number | null
          total_waste_litres?: number | null
          fw?: string | null
          timestamp?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "telemetry_data_device_id_fkey"
            columns: ["device_id"]
            referencedRelation: "devices"
            referencedColumns: ["id"]
          }
        ]
      }
      status_data: {
        Row: {
          id: string
          device_id: string
          event: string | null
          fw: string | null
          ip: string | null
          rssi: number | null
          uptime_ms: number | null
          interval_ms: number | null
          status: string | null
          timestamp: string
          created_at: string
        }
        Insert: {
          id?: string
          device_id: string
          event?: string | null
          fw?: string | null
          ip?: string | null
          rssi?: number | null
          uptime_ms?: number | null
          interval_ms?: number | null
          status?: string | null
          timestamp?: string
          created_at?: string
        }
        Update: {
          id?: string
          device_id?: string
          event?: string | null
          fw?: string | null
          ip?: string | null
          rssi?: number | null
          uptime_ms?: number | null
          interval_ms?: number | null
          status?: string | null
          timestamp?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_data_device_id_fkey"
            columns: ["device_id"]
            referencedRelation: "devices"
            referencedColumns: ["id"]
          }
        ]
      }
      mqtt_messages: {
        Row: {
          id: string
          device_id: string
          topic: string
          payload: string
          timestamp: string
          created_at: string
        }
        Insert: {
          id?: string
          device_id: string
          topic: string
          payload: string
          timestamp?: string
          created_at?: string
        }
        Update: {
          id?: string
          device_id?: string
          topic?: string
          payload?: string
          timestamp?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mqtt_messages_device_id_fkey"
            columns: ["device_id"]
            referencedRelation: "devices"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}