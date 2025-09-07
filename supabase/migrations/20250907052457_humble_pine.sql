/*
  # MQTT Veri Saklama Şeması

  1. Yeni Tablolar
    - `devices`
      - `id` (text, primary key) - Cihaz ID'si
      - `display_name` (text) - Cihaz görünen adı
      - `customer_id` (uuid, foreign key) - Müşteri ID'si
      - `is_online` (boolean) - Çevrimiçi durumu
      - `last_seen` (timestamptz) - Son görülme zamanı
      - `created_at` (timestamptz) - Oluşturulma zamanı
      - `updated_at` (timestamptz) - Güncellenme zamanı

    - `customers`
      - `id` (uuid, primary key) - Müşteri ID'si
      - `name` (text) - Müşteri adı
      - `created_at` (timestamptz) - Oluşturulma zamanı

    - `telemetry_data`
      - `id` (uuid, primary key) - Kayıt ID'si
      - `device_id` (text, foreign key) - Cihaz ID'si
      - `tds` (numeric) - TDS değeri
      - `temp` (numeric) - Sıcaklık değeri
      - `flow_clean` (numeric) - Temiz su akışı
      - `flow_waste` (numeric) - Atık su akışı
      - `total_clean_litres` (numeric) - Toplam temiz su
      - `total_waste_litres` (numeric) - Toplam atık su
      - `fw` (text) - Firmware versiyonu
      - `timestamp` (timestamptz) - Veri zamanı
      - `created_at` (timestamptz) - Kayıt zamanı

    - `status_data`
      - `id` (uuid, primary key) - Kayıt ID'si
      - `device_id` (text, foreign key) - Cihaz ID'si
      - `event` (text) - Olay türü
      - `fw` (text) - Firmware versiyonu
      - `ip` (text) - IP adresi
      - `rssi` (integer) - Sinyal gücü
      - `uptime_ms` (bigint) - Çalışma süresi
      - `interval_ms` (integer) - Veri gönderim aralığı
      - `status` (text) - Durum
      - `timestamp` (timestamptz) - Veri zamanı
      - `created_at` (timestamptz) - Kayıt zamanı

    - `mqtt_messages`
      - `id` (uuid, primary key) - Mesaj ID'si
      - `device_id` (text, foreign key) - Cihaz ID'si
      - `topic` (text) - MQTT konusu
      - `payload` (text) - Mesaj içeriği
      - `timestamp` (timestamptz) - Mesaj zamanı
      - `created_at` (timestamptz) - Kayıt zamanı

  2. Güvenlik
    - Tüm tablolarda RLS etkin
    - Admin kullanıcıları tüm verilere erişebilir
    - Müşteri kullanıcıları sadece kendi cihazlarının verilerine erişebilir

  3. İndeksler
    - Performans için gerekli indeksler eklendi
*/

-- Müşteriler tablosu
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Cihazlar tablosu
CREATE TABLE IF NOT EXISTS devices (
  id text PRIMARY KEY,
  display_name text,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  is_online boolean DEFAULT false,
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Telemetri verileri tablosu
CREATE TABLE IF NOT EXISTS telemetry_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Durum verileri tablosu
CREATE TABLE IF NOT EXISTS status_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- MQTT mesajları tablosu
CREATE TABLE IF NOT EXISTS mqtt_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  topic text NOT NULL,
  payload text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_telemetry_device_timestamp ON telemetry_data(device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_status_device_timestamp ON status_data(device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_mqtt_device_timestamp ON mqtt_messages(device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_devices_customer ON devices(customer_id);
CREATE INDEX IF NOT EXISTS idx_devices_online ON devices(is_online);

-- RLS Etkinleştirme
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE mqtt_messages ENABLE ROW LEVEL SECURITY;

-- RLS Politikaları
-- Admin kullanıcıları her şeye erişebilir
CREATE POLICY "Admin full access on customers"
  ON customers
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin full access on devices"
  ON devices
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin full access on telemetry_data"
  ON telemetry_data
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin full access on status_data"
  ON status_data
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin full access on mqtt_messages"
  ON mqtt_messages
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Müşteri kullanıcıları sadece kendi verilerine erişebilir
CREATE POLICY "Customer read own data on customers"
  ON customers
  FOR SELECT
  TO authenticated
  USING (id::text = auth.jwt() ->> 'customer_id');

CREATE POLICY "Customer read own devices"
  ON devices
  FOR SELECT
  TO authenticated
  USING (customer_id::text = auth.jwt() ->> 'customer_id');

CREATE POLICY "Customer read own telemetry"
  ON telemetry_data
  FOR SELECT
  TO authenticated
  USING (
    device_id IN (
      SELECT id FROM devices WHERE customer_id::text = auth.jwt() ->> 'customer_id'
    )
  );

CREATE POLICY "Customer read own status"
  ON status_data
  FOR SELECT
  TO authenticated
  USING (
    device_id IN (
      SELECT id FROM devices WHERE customer_id::text = auth.jwt() ->> 'customer_id'
    )
  );

CREATE POLICY "Customer read own messages"
  ON mqtt_messages
  FOR SELECT
  TO authenticated
  USING (
    device_id IN (
      SELECT id FROM devices WHERE customer_id::text = auth.jwt() ->> 'customer_id'
    )
  );

-- Otomatik güncelleme fonksiyonu
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger ekleme
CREATE TRIGGER update_devices_updated_at 
    BEFORE UPDATE ON devices 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();