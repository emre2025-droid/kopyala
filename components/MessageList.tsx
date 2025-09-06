import React from 'react';
import { MqttMessage } from '../types';

// Defined outside the component to prevent re-creation on every render.
const MessageItem: React.FC<{ message: MqttMessage }> = React.memo(({ message }) => (
    <div className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700 animate-fade-in">
        <div className="flex justify-between items-start mb-3">
            <div>
                <span className="text-xs font-semibold bg-cyan-900 text-cyan-200 px-2 py-1 rounded-md">
                    Konu: {message.topic}
                </span>
            </div>
            <span className="text-xs text-gray-400">{message.timestamp}</span>
        </div>
        <pre className="text-sm text-gray-200 bg-black/30 p-3 rounded-md overflow-x-auto whitespace-pre-wrap break-words">
            <code>{message.payload}</code>
        </pre>
    </div>
));


interface MessageListProps {
    messages: MqttMessage[];
    filterTopic: string;
    onFilterChange: (filter: string) => void;
}

const MessageList: React.FC<MessageListProps> = ({ messages, filterTopic, onFilterChange }) => {
    return (
        <div className="bg-gray-800/70 p-4 rounded-lg shadow-inner border border-gray-700 flex-grow flex flex-col min-h-0">
            <div className="flex-shrink-0 mb-4 pb-2 border-b border-gray-700 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h2 className="text-xl font-semibold text-gray-200">Canlı Telemetri Kayıtları</h2>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                        </svg>
                    </div>
                    <input
                        type="text"
                        id="topic-filter"
                        placeholder="Kayıtları filtrele..."
                        value={filterTopic}
                        onChange={(e) => onFilterChange(e.target.value)}
                        className="bg-gray-900 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full sm:w-64 pl-10 p-2.5 transition-colors"
                        aria-label="Mesajları konuya göre filtrele"
                    />
                </div>
            </div>
            {messages.length === 0 ? (
                <div className="flex-grow flex items-center justify-center">
                    <div className="text-center text-gray-500">
                         <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p className="mt-2">{filterTopic ? `Filtreyle eşleşen mesaj yok: "${filterTopic}"` : 'Telemetri mesajları bekleniyor...'}</p>
                    </div>
                </div>
            ) : (
                <div className="overflow-y-auto space-y-4 pr-2 -mr-2">
                    {messages.map((msg) => (
                        <MessageItem key={msg.id} message={msg} />
                    )).reverse()}
                </div>
            )}
        </div>
    );
};

export default MessageList;