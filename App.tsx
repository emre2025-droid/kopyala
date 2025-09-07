
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import mqtt from 'mqtt';
import { DatabaseService } from './src/lib/supabase';
import { MqttMessage, ConnectionStatusEnum, Device, TelemetryPayload, StatusPayload, UserRole, Customer } from './types';
import Header from './components/Header';
import ConnectionStatus from './components/ConnectionStatus';
import DeviceSidebar from './components/DeviceSidebar';
import DashboardView from './components/DashboardView';
import DeviceDetailView from './components/DeviceDetailView';
import LoginPage from './LoginPage';
import CustomerSelector from './CustomerSelector';

// --- Configs ---
// FIX: Hardcoded API_URL to '/api' to align with vite.config.js proxy and resolve TypeScript errors with `import.meta.env` when Vite client types are not found.
const API_URL = '/api';

const mqttConfig = {
    brokerUrl: 'wss://a1ad4768bc2847efa4eec689fee6b7bd.s1.eu.hivemq.cloud:8884/mqtt',
    options: {
        clientId: `mqttjs_${Math.random().toString(16).substr(2, 8)}`,
        username: 'Aquaa',
        password: 'OqpsHE#47oT1.BN0&$yh',
        clean: true,
        connectTimeout: 4000,
        reconnectPeriod: 1000,
    },
    topic: 'als/+/+'
};

// --- Custom Hooks ---

const useAuth = () => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!sessionStorage.getItem('isAuthenticated'));

    const login = (user: string, pass: string): boolean => {
        if (user === 'admin' && pass === 'admin') {
            sessionStorage.setItem('isAuthenticated', 'true');
            setIsAuthenticated(true);
            return true;
        }
        return false;
    };

    const logout = () => {
        sessionStorage.removeItem('isAuthenticated');
        setIsAuthenticated(false);
    };

    return { isAuthenticated, login, logout };
};

const useMqtt = (onMessage: (msg: MqttMessage) => void) => {
    const [status, setStatus] = useState<ConnectionStatusEnum>(ConnectionStatusEnum.DISCONNECTED);
    const clientRef = useRef<any | null>(null);

    useEffect(() => {
        setStatus(ConnectionStatusEnum.CONNECTING);
        clientRef.current = mqtt.connect(mqttConfig.brokerUrl, mqttConfig.options);
        const client = clientRef.current;

        // FIX: The `payload` from the mqtt library in a browser context is a Uint8Array, not a Node.js Buffer.
        // The type is changed to Uint8Array and TextDecoder is used for correct string conversion.
        const handleMessage = (topic: string, payload: Uint8Array) => {
            onMessage({
                id: `${Date.now()}-${topic}`,
                topic,
                payload: new TextDecoder().decode(payload),
                timestamp: new Date().toLocaleTimeString(),
            });
        };
        
        client.on('connect', () => { setStatus(ConnectionStatusEnum.CONNECTED); client.subscribe(mqttConfig.topic); });
        client.on('message', handleMessage);
        client.on('error', () => { setStatus(ConnectionStatusEnum.ERROR); client.end(); });
        client.on('reconnect', () => setStatus(ConnectionStatusEnum.CONNECTING));
        client.on('close', () => { if (status !== ConnectionStatusEnum.ERROR) setStatus(ConnectionStatusEnum.DISCONNECTED); });
        
        return () => client?.end(true);
    }, [onMessage]);

    const publish = useCallback((topic: string, payload: string) => {
        if (clientRef.current?.connected) {
            clientRef.current.publish(topic, payload, { qos: 1 });
        } else {
            console.error('MQTT client not connected. Cannot publish.');
        }
    }, []);

    return { status, publish };
};


// --- Main App Component ---
const App: React.FC = () => {
    const { isAuthenticated, login, logout } = useAuth();
    const [devices, setDevices] = useState<Map<string, Device>>(new Map());
    const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
    const [sidebarFilter, setSidebarFilter] = useState('');
    const [userRole, setUserRole] = useState<UserRole>('customer');
    
    // --- Persistent State ---
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [deviceNames, setDeviceName] = useState<Record<string, string>>({});
    const [assignments, setAssignments] = useState<Record<string, string>>({});
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const isInitialLoad = useRef(true);

    // Effect for fetching initial data from API or localStorage
    useEffect(() => {
        const loadData = async () => {
            try {
                // Supabase'den müşterileri yükle
                const customersData = await DatabaseService.getCustomers();
                setCustomers(customersData.map(c => ({ id: c.id, name: c.name })));

                // Supabase'den cihazları yükle
                const devicesData = await DatabaseService.getDevices();
                const names: Record<string, string> = {};
                const assignments: Record<string, string> = {};
                
                devicesData.forEach(device => {
                    if (device.display_name) {
                        names[device.id] = device.display_name;
                    }
                    if (device.customer_id) {
                        assignments[device.id] = device.customer_id;
                    }
                });
                
                setDeviceName(names);
                setAssignments(assignments);
            } catch (error) {
                console.error("Failed to fetch data from Supabase:", error);
                // Fallback to localStorage/API
                if (API_URL) {
                    try {
                        const response = await fetch(`${API_URL}/data`);
                        if (!response.ok) throw new Error('Network response was not ok');
                        const data = await response.json();
                        setCustomers(data.customers || []);
                        setDeviceName(data.deviceNames || {});
                        setAssignments(data.assignments || {});
                    } catch (error) {
                        console.error("Failed to fetch data from API:", error);
                    }
                } else {
                    const storedCustomers = localStorage.getItem('customers');
                    const storedDeviceNames = localStorage.getItem('deviceDisplayNames');
                    const storedAssignments = localStorage.getItem('deviceCustomerAssignments');
                    if (storedCustomers) setCustomers(JSON.parse(storedCustomers));
                    if (storedDeviceNames) setDeviceName(JSON.parse(storedDeviceNames));
                    if (storedAssignments) setAssignments(JSON.parse(storedAssignments));
                }
            }
            isInitialLoad.current = false;
        };
        loadData();
    }, []);

    // Effect for persisting data to API or localStorage on change
    useEffect(() => {
        if (isInitialLoad.current) return;

        // Supabase'e veri kaydetme artık gerçek zamanlı olarak yapılıyor
        // Bu effect sadece fallback için korunuyor
        const persistDataFallback = async () => {
            try {
                const dataToSave = { customers, deviceNames, assignments };
                if (API_URL) {
                    await fetch(`${API_URL}/data`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(dataToSave),
                    });
                } else {
                    localStorage.setItem('customers', JSON.stringify(customers));
                    localStorage.setItem('deviceDisplayNames', JSON.stringify(deviceNames));
                    localStorage.setItem('deviceCustomerAssignments', JSON.stringify(assignments));
                }
            } catch (error) {
                console.error("Failed to persist data:", error);
            }
        };
        persistDataFallback();
    }, [customers, deviceNames, assignments]);


    const handleMessage = useCallback((msg: MqttMessage) => {
        try {
            const data: TelemetryPayload | StatusPayload = JSON.parse(msg.payload);
            if (!data.device_id) return;

            const deviceId = data.device_id;
            
            // Veritabanına kaydet
            const saveToDatabase = async () => {
                try {
                    // Cihazı veritabanında güncelle/oluştur
                    await DatabaseService.upsertDevice({
                        id: deviceId,
                        display_name: deviceNames[deviceId] || null,
                        customer_id: assignments[deviceId] || null,
                        is_online: true,
                        last_seen: new Date().toISOString(),
                    });

                    // MQTT mesajını kaydet
                    await DatabaseService.insertMqttMessage({
                        device_id: deviceId,
                        topic: msg.topic,
                        payload: msg.payload,
                        timestamp: new Date().toISOString(),
                    });

                    // Telemetri veya durum verisini kaydet
                    if (msg.topic.endsWith('/tele')) {
                        const telemetryData = data as TelemetryPayload;
                        await DatabaseService.insertTelemetryData({
                            device_id: deviceId,
                            tds: telemetryData.tds,
                            temp: telemetryData.temp,
                            flow_clean: telemetryData.flow_clean,
                            flow_waste: telemetryData.flow_waste,
                            total_clean_litres: telemetryData.total_clean_litres,
                            total_waste_litres: telemetryData.total_waste_litres,
                            fw: telemetryData.fw,
                            timestamp: telemetryData.ts || new Date().toISOString(),
                        });
                    } else if (msg.topic.endsWith('/stat')) {
                        const statusData = data as StatusPayload;
                        await DatabaseService.insertStatusData({
                            device_id: deviceId,
                            event: statusData.event,
                            fw: statusData.fw,
                            ip: statusData.ip,
                            rssi: statusData.rssi,
                            uptime_ms: statusData.uptime_ms,
                            interval_ms: statusData.interval_ms,
                            status: statusData.status,
                            timestamp: statusData.ts || new Date().toISOString(),
                        });
                    }
                } catch (error) {
                    console.error('Database save error:', error);
                }
            };

            // Asenkron olarak veritabanına kaydet
            saveToDatabase();
            
            setDevices(prevDevices => {
                const newDevices = new Map(prevDevices);
                const existingDevice = newDevices.get(deviceId);
                
                const updatedDevice: Device = {
                    id: deviceId,
                    isOnline: true,
                    lastSeen: Date.now(),
                    latestTelemetry: existingDevice?.latestTelemetry || {},
                    statusInfo: existingDevice?.statusInfo || {},
                    messageHistory: [msg, ...(existingDevice?.messageHistory || []).slice(0, 499)],
                };

                if (msg.topic.endsWith('/tele')) {
                    updatedDevice.latestTelemetry = data as TelemetryPayload;
                } else if (msg.topic.endsWith('/stat')) {
                    updatedDevice.statusInfo = data as StatusPayload;
                }
                
                newDevices.set(deviceId, updatedDevice);
                return newDevices;
            });
        } catch (e) { /* Ignore non-JSON */ }
    }, []);

    const { status, publish } = useMqtt(handleMessage);
    
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setDevices(prevDevices => {
                const newDevices = new Map(prevDevices);
                let hasChanges = false;
                newDevices.forEach((device: Device, id) => {
                    if (now - device.lastSeen > 35000 && device.isOnline) {
                        newDevices.set(id, { ...device, isOnline: false });
                        hasChanges = true;
                    }
                });
                return hasChanges ? newDevices : prevDevices;
            });
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const augmentedDevices = useMemo(() => {
        const augmented = new Map<string, Device>();
        devices.forEach((device, id) => {
            augmented.set(id, {
                ...device,
                displayName: deviceNames[id],
                customerId: assignments[id],
            });
        });
        return augmented;
    }, [devices, deviceNames, assignments]);


    const deviceList = useMemo(() => {
        let list = Array.from(augmentedDevices.values());
        if (userRole === 'customer' && selectedCustomerId) {
            list = list.filter((d: Device) => d.customerId === selectedCustomerId);
        }
        return list.sort((a: Device, b: Device) => (a.displayName || a.id).localeCompare(b.displayName || b.id));
    }, [augmentedDevices, userRole, selectedCustomerId]);


    const filteredDevices = deviceList.filter(d => 
        (d.displayName || d.id).toLowerCase().includes(sidebarFilter.toLowerCase())
    );

    const selectedDevice = selectedDeviceId ? augmentedDevices.get(selectedDeviceId) : null;

    const handleSendCommand = (deviceId: string, command: string) => {
        publish(`als/${deviceId}/cmd`, command);
    };

    if (!isAuthenticated) {
        return <LoginPage onLogin={login} />;
    }

    return (
        <div className="min-h-screen bg-gray-900 font-sans flex flex-col">
            <Header 
                onTitleClick={() => setSelectedDeviceId(null)} 
                userRole={userRole}
                onRoleChange={setUserRole}
                onLogout={logout}
            >
               {userRole === 'customer' && (
                    <CustomerSelector 
                        customers={customers}
                        selectedCustomerId={selectedCustomerId}
                        onSelectCustomer={setSelectedCustomerId}
                    />
               )}
            </Header>

            <div className="flex-grow flex container mx-auto p-4 lg:p-6 gap-6 min-h-0">
                <DeviceSidebar 
                    devices={filteredDevices}
                    selectedDeviceId={selectedDeviceId}
                    onSelectDevice={setSelectedDeviceId}
                    filter={sidebarFilter}
                    onFilterChange={setSidebarFilter}
                />
                <main className="flex-grow flex flex-col gap-6 min-h-0">
                    <ConnectionStatus status={status} />
                    <div className="flex-grow min-h-0 overflow-y-auto pr-2 -mr-2">
                        {selectedDevice ? (
                             <DeviceDetailView 
                                device={selectedDevice} 
                                onSendCommand={handleSendCommand}
                                onRenameDevice={(id, name) => setDeviceName(prev => ({ ...prev, [id]: name }))}
                                userRole={userRole}
                             />
                        ) : (
                             <DashboardView 
                                devices={filteredDevices} 
                                onSelectDevice={setSelectedDeviceId}
                                userRole={userRole}
                                allDevices={Array.from(augmentedDevices.values())}
                                customers={customers}
                                setCustomers={setCustomers}
                                assignments={assignments}
                                setAssignments={setAssignments}
                             />
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default App;