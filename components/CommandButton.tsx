import React from 'react';

interface CommandButtonProps {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'warning' | 'danger';
    disabled?: boolean;
}

const CommandButton: React.FC<CommandButtonProps> = ({ label, onClick, variant = 'default', disabled = false }) => {
    const baseClasses = "w-full text-center text-sm font-semibold py-2 px-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed";

    const variantClasses = {
        default: 'bg-cyan-600 hover:bg-cyan-500 text-white focus:ring-cyan-500',
        warning: 'bg-yellow-500 hover:bg-yellow-400 text-black focus:ring-yellow-400',
        danger: 'bg-red-600 hover:bg-red-500 text-white focus:ring-red-500',
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`${baseClasses} ${variantClasses[variant]}`}
        >
            {label}
        </button>
    );
};

export default CommandButton;