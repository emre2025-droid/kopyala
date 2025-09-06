import React from 'react';
import { Customer } from './types';

interface CustomerSelectorProps {
    customers: Customer[];
    selectedCustomerId: string | null;
    onSelectCustomer: (customerId: string | null) => void;
}

const CustomerSelector: React.FC<CustomerSelectorProps> = ({ customers, selectedCustomerId, onSelectCustomer }) => {
    return (
        <div className="flex items-center gap-2">
            <label htmlFor="customer-select" className="text-sm text-gray-400">Müşteri:</label>
            <select
                id="customer-select"
                value={selectedCustomerId || ''}
                onChange={(e) => onSelectCustomer(e.target.value || null)}
                className="bg-gray-700 border-gray-600 text-gray-200 text-sm rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
                <option value="">Tüm Cihazlar</option>
                {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>{customer.name}</option>
                ))}
            </select>
        </div>
    );
};

export default CustomerSelector;
