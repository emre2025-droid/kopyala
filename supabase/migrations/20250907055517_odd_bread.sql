-- Create all required tables for the MQTT dashboard application
-- Run this SQL in your Supabase SQL Editor

-- 1. Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- 2. Create devices table
CREATE TABLE IF NOT EXISTS public.devices (
    id text PRIMARY KEY,
    display_name text,
    customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
    is_online boolean DEFAULT false,
    last_seen timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 3. Create telemetry_data table
CREATE TABLE IF NOT EXISTS public.telemetry_data (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id text NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
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

-- 4. Create status_data table
CREATE TABLE IF NOT EXISTS public.status_data (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id text NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
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

-- 5. Create mqtt_messages table
CREATE TABLE IF NOT EXISTS public.mqtt_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id text NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
    topic text NOT NULL,
    payload text NOT NULL,
    timestamp timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_devices_customer_id ON public.devices(customer_id);
CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON public.devices(last_seen);
CREATE INDEX IF NOT EXISTS idx_telemetry_device_timestamp ON public.telemetry_data(device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_status_device_timestamp ON public.status_data(device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_mqtt_device_timestamp ON public.mqtt_messages(device_id, timestamp DESC);

-- 7. Enable Row Level Security
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mqtt_messages ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies (allow all operations for now - you can restrict later)
CREATE POLICY "Allow all operations on customers" ON public.customers FOR ALL USING (true);
CREATE POLICY "Allow all operations on devices" ON public.devices FOR ALL USING (true);
CREATE POLICY "Allow all operations on telemetry_data" ON public.telemetry_data FOR ALL USING (true);
CREATE POLICY "Allow all operations on status_data" ON public.status_data FOR ALL USING (true);
CREATE POLICY "Allow all operations on mqtt_messages" ON public.mqtt_messages FOR ALL USING (true);

-- 9. Create trigger function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. Create trigger for devices table
CREATE TRIGGER update_devices_updated_at 
    BEFORE UPDATE ON public.devices 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 11. Insert sample customers
INSERT INTO public.customers (name) VALUES 
    ('Demo Otel'),
    ('Test Restoran'),
    ('Örnek Fabrika')
ON CONFLICT DO NOTHING;

-- Success message
SELECT 'All tables created successfully!' as result;