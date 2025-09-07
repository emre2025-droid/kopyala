
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
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

    // Effect for fetching initial data from Supabase
    useEffect(() => {
        const loadData = async () => {
            try {
                console.log('Loading data from Supabase...');
                
                // Önce veritabanı kurulumunu kontrol et
                await DatabaseService.ensureSetup();
                
                // Check if tables exist by trying to fetch customers
                const customersData = await DatabaseService.getCustomers();
                setCustomers(customersData.map(c => ({ id: c.id, name: c.name })));

                // Supabase'den cihazları yükle ve devices state'ini güncelle
                const devicesData = await DatabaseService.getDevices();
                const deviceMap = new Map<string, Device>();
                
                for (const dbDevice of devicesData) {
                    // Her cihaz için son telemetri ve MQTT mesajlarını yükle
                    const [telemetryData, mqttMessages] = await Promise.all([
                        DatabaseService.getTelemetryData(dbDevice.id, 1),
                        DatabaseService.getMqttMessages(dbDevice.id, 100)
                    ]);

                    const device: Device = {
                        id: dbDevice.id,
                        isOnline: dbDevice.is_online,
                        lastSeen: new Date(dbDevice.last_seen).getTime(),
                        latestTelemetry: telemetryData[0] ? {
                            device_id: telemetryData[0].device_id,
                            tds: telemetryData[0].tds || 0,
                            temp: telemetryData[0].temp || 0,
                            flow_clean: telemetryData[0].flow_clean || 0,
                            flow_waste: telemetryData[0].flow_waste || 0,
                            total_clean_litres: telemetryData[0].total_clean_litres || 0,
                            total_waste_litres: telemetryData[0].total_waste_litres || 0,
                            fw: telemetryData[0].fw || ''
                        } : {},
                        statusInfo: {},
                        messageHistory: mqttMessages.map(msg => ({
                            id: msg.id,
                            topic: msg.topic,
                            payload: msg.payload,
                            timestamp: new Date(msg.timestamp).toLocaleTimeString()
                        })),
                        displayName: dbDevice.display_name || undefined,
                        customerId: dbDevice.customer_id || undefined
                    };
                    
                    deviceMap.set(dbDevice.id, device);
                }
                
                setDevices(deviceMap);
                console.log('Data loaded successfully from Supabase');
            } catch (error) {
                console.error('Failed to load data from Supabase:', error);
                console.log('📋 Please create the required tables manually in Supabase SQL Editor');
                console.log('🔗 Go to: https://supabase.com/dashboard/project/vrconfbmqtvrldnwondk/editor');
            }
        };
        loadData();
    }, []);

    // Periyodik olarak cihaz durumlarını güncelle
    useEffect(() => {
        const updateDeviceStatuses = async () => {
            try {
                await DatabaseService.ensureSetup();
                const devicesData = await DatabaseService.getDevices();
                setDevices(prevDevices => {
                    const newDevices = new Map(prevDevices);
                    devicesData.forEach(dbDevice => {
                        const existingDevice = newDevices.get(dbDevice.id);
                        if (existingDevice) {
                            newDevices.set(dbDevice.id, {
                                ...existingDevice,
                                displayName: dbDevice.display_name || undefined,
                                customerId: dbDevice.customer_id || undefined,
                                isOnline: dbDevice.is_online,
                                lastSeen: new Date(dbDevice.last_seen).getTime()
                            });
                        }
                    });
                    return newDevices;
                });
            } catch (error) {
                console.error('Failed to update device statuses:', error);
            }
        };

        // İlk yükleme sonrası periyodik güncelleme
        const interval = setInterval(updateDeviceStatuses, 30000); // 30 saniyede bir
        return () => clearInterval(interval);
    }, []);


    const handleMessage = useCallback((msg: MqttMessage) => {
        try {
            const data: TelemetryPayload | StatusPayload = JSON.parse(msg.payload);
            if (!data.device_id) return;

            const deviceId = data.device_id;
            
            // Veritabanına kaydet
            const saveToDatabase = async () => {
                try {
                    await DatabaseService.ensureSetup();
                    
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

                    // Cihazı veritabanında güncelle/oluştur
                    const existingDevice = devices.get(deviceId);
                    await DatabaseService.upsertDevice({
                        id: deviceId,
                        display_name: existingDevice?.displayName || null,
                        customer_id: existingDevice?.customerId || null,
                        is_online: true,
                        last_seen: new Date().toISOString(),
                    });
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

    const deviceList = useMemo(() => {
        let list = Array.from(devices.values());
        if (userRole === 'customer' && selectedCustomerId) {
            list = list.filter((d: Device) => d.customerId === selectedCustomerId);
        }
        return list.sort((a: Device, b: Device) => (a.displayName || a.id).localeCompare(b.displayName || b.id));
    }, [devices, userRole, selectedCustomerId]);


    const filteredDevices = deviceList.filter(d => 
        (d.displayName || d.id).toLowerCase().includes(sidebarFilter.toLowerCase())
    );

    const selectedDevice = selectedDeviceId ? devices.get(selectedDeviceId) : null;

    const handleSendCommand = (deviceId: string, command: string) => {
        publish(`als/${deviceId}/cmd`, command);
    };

    const handleRenameDevice = async (deviceId: string, newName: string) => {
        try {
            await DatabaseService.updateDeviceName(deviceId, newName);
            setDevices(prevDevices => {
                const newDevices = new Map(prevDevices);
                const device = newDevices.get(deviceId);
                if (device) {
                    newDevices.set(deviceId, { ...device, displayName: newName });
                }
                return newDevices;
            });
        } catch (error) {
            console.error('Error renaming device:', error);
        }
    };

    const handleAssignDevice = async (deviceId: string, customerId: string | null) => {
        try {
            await DatabaseService.updateDeviceCustomer(deviceId, customerId);
            setDevices(prevDevices => {
                const newDevices = new Map(prevDevices);
                const device = newDevices.get(deviceId);
                if (device) {
                    newDevices.set(deviceId, { ...device, customerId: customerId || undefined });
                }
                return newDevices;
            });
        } catch (error) {
            console.error('Error assigning device:', error);
        }
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
                                onRenameDevice={handleRenameDevice}
                                userRole={userRole}
                             />
                        ) : (
                             <DashboardView 
                                devices={filteredDevices} 
                                onSelectDevice={setSelectedDeviceId}
                                userRole={userRole}
                                allDevices={Array.from(devices.values())}
                                customers={customers}
                                setCustomers={setCustomers}
                                onAssignDevice={handleAssignDevice}
                             />
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default App;