import React from 'react';
import { ConnectionStatusEnum } from '../types';

interface ConnectionStatusProps {
    status: ConnectionStatusEnum;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status }) => {
    const statusConfig = {
        [ConnectionStatusEnum.CONNECTED]: {
            bgColor: 'bg-green-500',
            textColor: 'text-green-100',
            dotColor: 'bg-green-400',
            text: 'Bağlandı',
        },
        [ConnectionStatusEnum.CONNECTING]: {
            bgColor: 'bg-yellow-500',
            textColor: 'text-yellow-100',
            dotColor: 'bg-yellow-400',
            text: 'Bağlanıyor...',
        },
        [ConnectionStatusEnum.DISCONNECTED]: {
            bgColor: 'bg-gray-600',
            textColor: 'text-gray-100',
            dotColor: 'bg-gray-400',
            text: 'Bağlantı Kesildi',
        },
        [ConnectionStatusEnum.ERROR]: {
            bgColor: 'bg-red-600',
            textColor: 'text-red-100',
            dotColor: 'bg-red-400',
            text: 'Bağlantı Hatası',
        },
    };

    const config = statusConfig[status];

    return (
        <div className="p-4 bg-gray-800 rounded-lg shadow-inner border border-gray-700">
            <div className="flex items-center justify-between">
                 <span className="text-lg font-medium text-gray-300">Broker Durumu</span>
                 <div className={`flex items-center space-x-2 px-4 py-1.5 rounded-full ${config.bgColor} ${config.textColor} text-sm font-semibold transition-all duration-300`}>
                    <span className={`h-2.5 w-2.5 ${config.dotColor} rounded-full ${status === ConnectionStatusEnum.CONNECTING ? 'animate-pulse' : ''}`}></span>
                    <span>{config.text}</span>
                </div>
            </div>
        </div>
    );
};

export default ConnectionStatus;