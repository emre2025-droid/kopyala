import React, { useState } from 'react';

interface CommandModalProps {
    title: string;
    inputLabel: string;
    inputType?: string;
    onClose: () => void;
    onSubmit: (value: string) => void;
}

const CommandModal: React.FC<CommandModalProps> = ({ title, inputLabel, inputType = 'text', onClose, onSubmit }) => {
    const [value, setValue] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (value.trim()) {
            onSubmit(value);
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
            aria-labelledby="command-modal-title"
            role="dialog"
            aria-modal="true"
        >
            <div 
                className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-5 border-b border-gray-700">
                    <h2 id="command-modal-title" className="text-lg font-semibold text-gray-100">{title}</h2>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-5">
                        <label htmlFor="command-input" className="block mb-2 text-sm font-medium text-gray-300">
                            {inputLabel}
                        </label>
                        <input
                            id="command-input"
                            type={inputType}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            className="bg-gray-900 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5 transition-colors"
                            required
                            autoFocus
                        />
                    </div>
                    <div className="px-5 py-4 bg-gray-800/50 border-t border-gray-700 flex justify-end items-center gap-3 rounded-b-lg">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 focus:ring-offset-gray-800"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-gray-800"
                        >
                            Komutu Gönder
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CommandModal;