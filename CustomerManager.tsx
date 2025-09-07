import React, { useState } from 'react';
import { DatabaseService } from './lib/supabase';
import { Customer, Device } from './types';

interface CustomerManagerProps {
    customers: Customer[];
    setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
    allDevices: Device[];
    assignments: Record<string, string>;
    setAssignments: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

const CustomerManager: React.FC<CustomerManagerProps> = ({ customers, setCustomers, allDevices, assignments, setAssignments }) => {
    const [newCustomerName, setNewCustomerName] = useState('');

    const handleAddCustomer = (e: React.FormEvent) => {
        e.preventDefault();
        const addCustomer = async () => {
            if (newCustomerName.trim() && !customers.some(c => c.name === newCustomerName.trim())) {
                try {
                    const newCustomer = await DatabaseService.createCustomer(newCustomerName.trim());
                    setCustomers(prev => [...prev, { id: newCustomer.id, name: newCustomer.name }]);
                    setNewCustomerName('');
                } catch (error) {
                    console.error('Error creating customer:', error);
                    // Fallback to local state
                    const newCustomer: Customer = { id: `cust_${Date.now()}`, name: newCustomerName.trim() };
                    setCustomers(prev => [...prev, newCustomer]);
                    setNewCustomerName('');
                }
            }
        };
        addCustomer();
    };
    
    const handleAssignDevice = async (deviceId: string, customerId: string) => {
        try {
            // Supabase'de güncelle
            await DatabaseService.updateDeviceCustomer(deviceId, customerId || null);
            
            // Local state'i güncelle
            setAssignments(prev => {
                const newAssignments = { ...prev };
                if (customerId) {
                    newAssignments[deviceId] = customerId;
                } else {
                    delete newAssignments[deviceId]; // Unassign
                }
                return newAssignments;
            });
        } catch (error) {
            console.error('Error assigning device:', error);
            // Fallback to local state only
            setAssignments(prev => {
                const newAssignments = { ...prev };
                if (customerId) {
                    newAssignments[deviceId] = customerId;
                } else {
                    delete newAssignments[deviceId]; // Unassign
                }
                return newAssignments;
            });
        }
    };

    const unassignedDevices = allDevices.filter(d => !d.customerId);
    
    return (
        <div className="p-4 bg-gray-800/70 rounded-lg shadow-inner border border-gray-700 h-full flex flex-col gap-6">
            {/* Add Customer Form */}
            <div className="flex-shrink-0">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">Yeni Müşteri Ekle</h3>
                <form onSubmit={handleAddCustomer} className="flex gap-2">
                    <input
                        type="text"
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        placeholder="Müşteri Adı (Örn: X Oteli)"
                        className="flex-grow bg-gray-900 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5"
                    />
                    <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-cyan-600 rounded-md hover:bg-cyan-500">
                        Ekle
                    </button>
                </form>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow min-h-0">
                {/* Customer List */}
                <div className="bg-gray-800 p-4 rounded-lg flex flex-col">
                    <h3 className="text-lg font-semibold text-gray-200 mb-2 flex-shrink-0">Müşteriler ({customers.length})</h3>
                    <div className="overflow-y-auto space-y-2">
                        {customers.map(customer => (
                            <div key={customer.id} className="bg-gray-900 p-3 rounded-md">
                                <p className="font-semibold text-gray-200">{customer.name}</p>
                                <ul className="text-xs text-gray-400 mt-1 pl-4 list-disc">
                                    {allDevices.filter(d => d.customerId === customer.id).map(d => (
                                        <li key={d.id} className="font-mono">{d.displayName || d.id}</li>
                                    ))}
                                    {allDevices.filter(d => d.customerId === customer.id).length === 0 && (
                                        <li>Henüz cihaz atanmadı.</li>
                                    )}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                 {/* Unassigned Devices */}
                <div className="bg-gray-800 p-4 rounded-lg flex flex-col">
                    <h3 className="text-lg font-semibold text-gray-200 mb-2 flex-shrink-0">Atanmamış Cihazlar ({unassignedDevices.length})</h3>
                    <div className="overflow-y-auto space-y-2">
                        {unassignedDevices.length > 0 ? unassignedDevices.map(device => (
                            <div key={device.id} className="flex items-center justify-between bg-gray-900 p-3 rounded-md gap-2">
                                <span className="font-mono text-sm text-gray-200 truncate">{device.displayName || device.id}</span>
                                <select 
                                    value={''}
                                    onChange={(e) => handleAssignDevice(device.id, e.target.value)}
                                    className="bg-gray-700 border-gray-600 text-gray-200 text-xs rounded p-1"
                                >
                                    <option value="">Müşteri Seç...</option>
                                    {customers.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        )) : <p className="text-gray-500 text-sm">Atanacak cihaz yok.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerManager;
