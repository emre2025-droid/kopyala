import React, { useState } from 'react';
import { Device, UserRole, Customer } from '../types';
import CustomerManager from '../CustomerManager';

interface DeviceCardProps {
    device: Device;
    onSelect: (id: string) => void;
}

const Stat: React.FC<{ label: string; value: string | number; unit?: string }> = ({ label, value, unit }) => (
    <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-lg font-semibold text-gray-100">
            {value} <span className="text-sm font-normal text-gray-300">{unit}</span>
        </p>
    </div>
);

const DeviceCard: React.FC<DeviceCardProps> = ({ device, onSelect }) => {
    return (
        <div 
            className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700 cursor-pointer hover:bg-gray-700/50 hover:border-cyan-500 transition-all duration-200"
            onClick={() => onSelect(device.id)}
        >
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="font-semibold text-gray-100 truncate" title={device.displayName || device.id}>{device.displayName || device.id}</h3>
                    {device.displayName && <p className="text-xs font-mono text-cyan-400 truncate">{device.id}</p>}
                </div>
                <div className={`flex items-center gap-2 text-xs font-bold px-2 py-1 rounded-full ${device.isOnline ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                    <span className={`h-2 w-2 rounded-full ${device.isOnline ? 'bg-green-400' : 'bg-red-400'}`}></span>
                    {device.isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Stat label="TDS" value={device.latestTelemetry.tds ?? 'N/A'} unit="ppm" />
                <Stat label="Sıcaklık" value={device.latestTelemetry.temp ?? 'N/A'} unit="°C" />
                <Stat label="Toplam Temiz Su" value={device.latestTelemetry.total_clean_litres?.toFixed(2) ?? 'N/A'} unit="L" />
                <Stat label="Toplam Atık Su" value={device.latestTelemetry.total_waste_litres?.toFixed(2) ?? 'N/A'} unit="L" />
            </div>
        </div>
    );
};


interface DashboardViewProps {
    devices: Device[];
    onSelectDevice: (id: string) => void;
    userRole: UserRole;
    allDevices: Device[];
    customers: Customer[];
    setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
    assignments: Record<string, string>;
    setAssignments: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

const TabButton: React.FC<{isActive: boolean, onClick: ()=>void, children: React.ReactNode}> = ({isActive, onClick, children}) => (
    <button onClick={onClick} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${isActive ? 'text-cyan-400 border-cyan-400' : 'text-gray-400 border-transparent hover:text-white' } border-b-2`}>
        {children}
    </button>
)

const DashboardView: React.FC<DashboardViewProps> = ({ devices, onSelectDevice, userRole, ...adminProps }) => {
    const [activeTab, setActiveTab] = useState('overview');

    const renderContent = () => {
        if (devices.length === 0) {
            return (
                <div className="flex-grow flex items-center justify-center text-center text-gray-500 h-full">
                     <div>
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-200">Cihaz bulunamadı</h3>
                        <p className="mt-1 text-sm text-gray-400">Filtrenizi temizlemeyi, bir müşteri seçmeyi veya yeni cihazların bağlanmasını beklemeyi deneyin.</p>
                    </div>
                </div>
            );
        }
        
        return (
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                {devices.map(device => (
                    <DeviceCard key={device.id} device={device} onSelect={onSelectDevice} />
                ))}
            </div>
        );
    }
    
    if (userRole === 'admin') {
         return (
            <div className="flex flex-col h-full animate-fade-in">
                <div className="flex-shrink-0 border-b border-gray-700 mb-4">
                    <TabButton isActive={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>Filo Genel Bakışı</TabButton>
                    <TabButton isActive={activeTab === 'customers'} onClick={() => setActiveTab('customers')}>Müşteri Yönetimi</TabButton>
                </div>
                <div className="flex-grow min-h-0 overflow-y-auto">
                    {activeTab === 'overview' ? renderContent() : <CustomerManager {...adminProps} />}
                </div>
            </div>
        )
    }

    return (
        <div className="animate-fade-in h-full">
            {renderContent()}
        </div>
    );
};

export default DashboardView;
