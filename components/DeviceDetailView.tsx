import React, { useState, useEffect } from 'react';
import { Device, UserRole } from '../types';
import MessageList from './MessageList';
import CommandButton from './CommandButton';
import CommandModal from './CommandModal';
import DataChart from './DataChart';

const StatusItem: React.FC<{ label: string; value: string | number | undefined }> = ({ label, value }) => (
    <div className="py-2 px-3 bg-gray-900/50 rounded-md flex justify-between items-center">
        <span className="text-sm text-gray-400">{label}</span>
        <span className="text-sm font-semibold font-mono text-gray-200">{value ?? 'N/A'}</span>
    </div>
);

interface DeviceDetailViewProps {
    device: Device;
    onSendCommand: (deviceId: string, command: string) => void;
    onRenameDevice: (deviceId: string, newName: string) => void;
    userRole: UserRole;
}

interface ModalState {
    command: string;
    title: string;
    inputLabel: string;
    inputType?: string;
    prefix?: string;
}

const DeviceDetailView: React.FC<DeviceDetailViewProps> = ({ device, onSendCommand, onRenameDevice, userRole }) => {
    const [filterTopic, setFilterTopic] = useState('');
    const [modalState, setModalState] = useState<ModalState | null>(null);
    const [isEditingName, setIsEditingName] = useState(false);
    const [currentName, setCurrentName] = useState('');
    
    useEffect(() => {
        // Reset edit state when device changes
        setIsEditingName(false);
    }, [device.id]);


    const filteredMessages = device.messageHistory.filter(msg =>
        msg.topic.toLowerCase().includes(filterTopic.toLowerCase())
    );

    const handleSimpleCommand = (command: string) => {
        onSendCommand(device.id, command);
    };

    const handleDestructiveCommand = (command: string, prompt: string) => {
        if (window.confirm(prompt)) {
            onSendCommand(device.id, command);
        }
    };

    const handleModalSubmit = (value: string) => {
        if (modalState?.prefix) {
            onSendCommand(device.id, `${modalState.prefix}${value}`);
        }
        setModalState(null);
    };

    const handleNameSubmit = () => {
        onRenameDevice(device.id, currentName.trim());
        setIsEditingName(false);
    };
    
    const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleNameSubmit();
        if (e.key === 'Escape') setIsEditingName(false);
    };


    return (
        <>
            <div className="h-full flex flex-col gap-6 animate-fade-in">
                 <div className="bg-gray-800/70 p-4 rounded-lg shadow-inner border border-gray-700 flex-shrink-0">
                    <div className="flex items-start justify-between">
                        <div className="flex-grow min-w-0">
                            {isEditingName && userRole === 'admin' ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={currentName}
                                        onChange={(e) => setCurrentName(e.target.value)}
                                        onBlur={handleNameSubmit}
                                        onKeyDown={handleNameKeyDown}
                                        className="text-xl font-semibold bg-gray-900 text-white p-1 -m-1 rounded-md border border-cyan-500 w-full"
                                        autoFocus
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 group">
                                    <h2 className="text-xl font-semibold text-gray-200 truncate" title={device.displayName || device.id}>
                                        {device.displayName || device.id}
                                    </h2>
                                    {userRole === 'admin' && (
                                        <button 
                                            onClick={() => {
                                                setCurrentName(device.displayName || '');
                                                setIsEditingName(true);
                                            }} 
                                            title="Cihaz adını düzenle" 
                                            className="text-gray-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L14.732 3.732z" /></svg>
                                        </button>
                                    )}
                                </div>
                            )}
                            { (device.displayName && device.displayName !== device.id) &&
                                <p className="font-mono text-cyan-400 text-sm truncate pt-1">{device.id}</p>
                            }
                        </div>
                        <div className={`flex items-center gap-2 text-sm font-bold px-3 py-1.5 rounded-full flex-shrink-0 ml-4 ${device.isOnline ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                            <span className={`h-2.5 w-2.5 rounded-full ${device.isOnline ? 'bg-green-400' : 'bg-red-400'}`}></span>
                            {device.isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
                        </div>
                    </div>
                    {userRole === 'admin' && (
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-4">
                            <StatusItem label="Yazılım Sürümü" value={device.statusInfo.fw} />
                            <StatusItem label="IP Adresi" value={device.statusInfo.ip} />
                            <StatusItem label="Sinyal Gücü" value={device.statusInfo.rssi ? `${device.statusInfo.rssi} dBm` : undefined} />
                            <StatusItem label="Çalışma Süresi" value={device.statusInfo.uptime_ms ? `${(device.statusInfo.uptime_ms / 1000 / 60).toFixed(2)} dk` : undefined} />
                            <StatusItem label="Aralık" value={device.statusInfo.interval_ms ? `${device.statusInfo.interval_ms} ms` : undefined} />
                            <StatusItem label="Son Olay" value={device.statusInfo.event} />
                        </div>
                    )}
                </div>

                {/* --- Veri Grafikleri --- */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <DataChart
                        messages={device.messageHistory}
                        title="TDS Zaman Grafiği"
                        dataKeys={[{ key: 'tds', name: 'TDS', color: '#06b6d4' }]}
                        unit="ppm"
                    />
                     <DataChart
                        messages={device.messageHistory}
                        title="Sıcaklık Zaman Grafiği"
                        dataKeys={[{ key: 'temp', name: 'Sıcaklık', color: '#f59e0b' }]}
                        unit="°C"
                    />
                     <DataChart
                        messages={device.messageHistory}
                        title="Toplam Su Kullanımı Grafiği"
                        dataKeys={[
                            { key: 'total_clean_litres', name: 'Toplam Şebeke Suyu', color: '#38bdf8' },
                            { key: 'total_waste_litres', name: 'Toplam Atık Su', color: '#f59e0b' },
                        ]}
                        unit="L"
                    />
                </div>

                {/* --- Uzak Komutlar Paneli (Admin Only) --- */}
                {userRole === 'admin' && (
                    <div className="bg-gray-800/70 p-4 rounded-lg shadow-inner border border-gray-700 flex-shrink-0">
                        <h2 className="text-xl font-semibold text-gray-200 mb-4">Uzak Komutlar</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {/* Güvenli Komutlar */}
                            <CommandButton label="Durum İste" onClick={() => handleSimpleCommand('STATUS')} />
                            <CommandButton label="Temiz Litre Sıfırla" onClick={() => handleSimpleCommand('RESET_CLEAN_LITRES')} />
                            <CommandButton label="Atık Litre Sıfırla" onClick={() => handleSimpleCommand('RESET_WASTE_LITRES')} />
                            
                            {/* Girdili Komutlar */}
                            <CommandButton label="Aralık Ayarla" onClick={() => setModalState({ command: 'SET_INTERVAL_MS', title: 'Telemetri Aralığını Ayarla', inputLabel: 'Aralık (ms)', prefix: 'SET_INTERVAL_MS=' })} />
                            <CommandButton label="OTA Güncelleme" onClick={() => setModalState({ command: 'OTA', title: 'OTA Güncellemesi Yap', inputLabel: 'Yazılım URL\'si', prefix: 'OTA ' })} />

                            {/* Uyarı Komutları */}
                            <CommandButton label="Cihazı Yeniden Başlat" variant="warning" onClick={() => handleDestructiveCommand('REBOOT', 'Bu cihazı yeniden başlatmak istediğinizden emin misiniz?')} />
                            
                            {/* Yıkıcı Komutlar */}
                            <CommandButton label="Wi-Fi Sıfırla" variant="danger" onClick={() => handleDestructiveCommand('RESET_WIFI', 'UYARI: Bu işlem Wi-Fi kimlik bilgilerini silecek ve cihazın bağlantısını kesecektir. Emin misiniz?')} />
                            <CommandButton label="Fabrika Ayarlarına Dön" variant="danger" onClick={() => handleDestructiveCommand('FACTORY_RESET', 'TEHLİKE: Bu işlem cihazdaki TÜM ayarları ve verileri silecektir. Bu işlem geri alınamaz. Emin misiniz?')} />
                        </div>
                    </div>
                )}
                
                <div className="flex-grow min-h-0">
                    <MessageList
                        messages={filteredMessages}
                        filterTopic={filterTopic}
                        onFilterChange={setFilterTopic}
                    />
                </div>
            </div>
            {modalState && (
                <CommandModal 
                    title={modalState.title}
                    inputLabel={modalState.inputLabel}
                    inputType={modalState.inputType}
                    onClose={() => setModalState(null)}
                    onSubmit={handleModalSubmit}
                />
            )}
        </>
    );
};

export default DeviceDetailView;