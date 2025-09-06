import React from 'react';
import { UserRole } from '../types';

interface HeaderProps {
    onTitleClick: () => void;
    userRole: UserRole;
    onRoleChange: (role: UserRole) => void;
    onLogout: () => void;
    children?: React.ReactNode;
}

const RoleButton: React.FC<{ isActive: boolean, onClick: () => void, children: React.ReactNode }> = ({ isActive, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
            isActive ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
    >
        {children}
    </button>
);


const Header: React.FC<HeaderProps> = ({ onTitleClick, userRole, onRoleChange, onLogout, children }) => {
    return (
        <header className="bg-gray-800/50 backdrop-blur-sm p-4 shadow-lg border-b border-gray-700 sticky top-0 z-20">
            <div className="container mx-auto flex items-center justify-between gap-4">
                <div 
                    className="flex items-center space-x-4 cursor-pointer"
                    onClick={onTitleClick}
                    title="Panele Geri Dön"
                >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12.55a8 8 0 0 1 14.08 0"/>
                        <path d="M1.42 9.5a16 16 0 0 1 21.16 0"/>
                        <path d="M8.53 16.11a4 4 0 0 1 6.95 0"/>
                        <line x1="12" y1="20" x2="12" y2="22"/>
                    </svg>
                    <h1 className="text-2xl font-bold text-gray-100 tracking-wider">
                        ALS Kontrol Paneli
                    </h1>
                </div>

                {children}

                <div className="flex items-center space-x-2 p-1 bg-gray-900/50 rounded-lg">
                    <RoleButton isActive={userRole === 'customer'} onClick={() => onRoleChange('customer')}>
                        Müşteri
                    </RoleButton>
                    <RoleButton isActive={userRole === 'admin'} onClick={() => onRoleChange('admin')}>
                        Yönetici
                    </RoleButton>
                </div>
                 <button 
                    onClick={onLogout}
                    className="px-4 py-2 text-sm font-semibold text-gray-300 bg-red-800/50 rounded-md hover:bg-red-700 transition-colors"
                    title="Oturumu Kapat"
                >
                    Çıkış Yap
                </button>
            </div>
        </header>
    );
};

export default Header;
