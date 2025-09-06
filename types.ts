export interface MqttMessage {
  id: string;
  topic: string;
  payload: string;
  timestamp: string;
}

export enum ConnectionStatusEnum {
    CONNECTING = 'Connecting',
    CONNECTED = 'Connected',
    DISCONNECTED = 'Disconnected',
    ERROR = 'Error',
}

// --- New Types for Multi-Device Dashboard ---
export type UserRole = 'admin' | 'customer';

export interface Customer {
    id: string;
    name: string;
}

export interface TelemetryPayload {
  device_id: string;
  ts?: string;
  tds: number;
  temp: number;
  flow_clean: number;
  flow_waste: number;
  total_clean_litres: number;
  total_waste_litres: number;
  fw: string;
}

export interface StatusPayload {
  device_id: string;
  event: string;
  ts?: string;
  fw: string;
  ip?: string;
  rssi?: number;
  uptime_ms?: number;
  interval_ms?: number;
  status?: 'online' | 'offline';
}

export interface Device {
  id: string;
  isOnline: boolean;
  lastSeen: number;
  latestTelemetry: Partial<TelemetryPayload>;
  statusInfo: Partial<StatusPayload>;
  messageHistory: MqttMessage[];
  displayName?: string;
  customerId?: string | null;
}
