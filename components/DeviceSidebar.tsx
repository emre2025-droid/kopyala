import React from 'react';
import { Device } from '../types';

interface DeviceSidebarProps {
    devices: Device[];
    selectedDeviceId: string | null;
    onSelectDevice: (id: string) => void;
    filter: string;
    onFilterChange: (value: string) => void;
}

const DeviceItem: React.FC<{ device: Device; isSelected: boolean; onSelect: () => void; }> = React.memo(({ device, isSelected, onSelect }) => (
    <li
        onClick={onSelect}
        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors duration-200 ${
            isSelected ? 'bg-cyan-600/30' : 'hover:bg-gray-700/50'
        }`}
    >
        <div className="flex items-center gap-3 min-w-0">
            <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${device.isOnline ? 'bg-green-400' : 'bg-gray-500'}`}></span>
            <span className="font-mono text-sm text-gray-200 truncate">{device.displayName || device.id}</span>
        </div>
        <span className={`text-xs font-semibold ${device.isOnline ? 'text-green-400' : 'text-gray-500'}`}>
            {device.isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
        </span>
    </li>
));

const DeviceSidebar: React.FC<DeviceSidebarProps> = ({ devices, selectedDeviceId, onSelectDevice, filter, onFilterChange }) => {
    return (
        <aside className="w-1/4 max-w-xs bg-gray-800/70 p-4 rounded-lg shadow-inner border border-gray-700 flex-shrink-0 flex flex-col">
            <h2 className="text-xl font-semibold text-gray-200 mb-4 pb-2 border-b border-gray-700">Cihazlar ({devices.length})</h2>
            <div className="relative mb-4">
                <input
                    type="text"
                    placeholder="Cihaz ara..."
                    value={filter}
                    onChange={(e) => onFilterChange(e.target.value)}
                    className="bg-gray-900 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5 transition-colors"
                    aria-label="Cihazları isme veya ID'ye göre filtrele"
                />
            </div>
            {devices.length > 0 ? (
                <ul className="overflow-y-auto space-y-2 pr-2 -mr-2 flex-grow">
                    {devices.map(device => (
                        <DeviceItem 
                            key={device.id}
                            device={device}
                            isSelected={device.id === selectedDeviceId}
                            onSelect={() => onSelectDevice(device.id)}
                        />
                    ))}
                </ul>
            ) : (
                 <div className="flex-grow flex items-center justify-center text-center text-gray-500">
                    <p>Cihaz bulunamadı.</p>
                </div>
            )}
        </aside>
    );
};

export default DeviceSidebar;