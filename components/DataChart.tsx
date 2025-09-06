import React, { useMemo } from 'react';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line } from 'recharts';
import { MqttMessage, TelemetryPayload } from '../types';

interface DataKeyConfig {
    key: keyof TelemetryPayload;
    name: string;
    color: string;
}

interface DataChartProps {
    messages: MqttMessage[];
    title: string;
    dataKeys: DataKeyConfig[];
    unit: string;
}

const DataChart: React.FC<DataChartProps> = React.memo(({ messages, title, dataKeys, unit }) => {

    const chartData = useMemo(() => {
        return messages
            .map(msg => {
                try {
                    // We only care about telemetry messages for charts
                    if (!msg.topic.endsWith('/tele')) return null;
                    const payload = JSON.parse(msg.payload) as TelemetryPayload;
                    
                    const dataPoint: { [key: string]: any } = {
                        timestamp: msg.timestamp,
                    };

                    let hasValidData = false;
                    for (const config of dataKeys) {
                        const value = payload[config.key];
                        if (typeof value === 'number') {
                            dataPoint[config.key] = value;
                            hasValidData = true;
                        }
                    }
                    return hasValidData ? dataPoint : null;
                } catch (e) {
                    return null;
                }
            })
            .filter(Boolean)
            .reverse(); // Reverse to show oldest data first
    }, [messages, dataKeys]);
    
    if (chartData.length < 2) {
        return (
            <div className="bg-gray-800/70 p-4 rounded-lg shadow-inner border border-gray-700 h-64 flex flex-col">
                <h3 className="text-md font-semibold text-gray-200 mb-2 flex-shrink-0">{title}</h3>
                <div className="flex-grow flex items-center justify-center text-gray-500">
                    <p>Grafik için yeterli veri yok.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-800/70 p-4 rounded-lg shadow-inner border border-gray-700 h-64 flex flex-col">
            <h3 className="text-md font-semibold text-gray-200 mb-2 flex-shrink-0">{title}</h3>
            <div className="flex-grow">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                        <XAxis dataKey="timestamp" stroke="#a0aec0" fontSize={12} tick={{ fill: '#a0aec0' }} />
                        <YAxis stroke="#a0aec0" fontSize={12} tick={{ fill: '#a0aec0' }} unit={` ${unit}`} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1a202c',
                                border: '1px solid #4a5568',
                                color: '#e2e8f0',
                            }}
                            labelStyle={{ color: '#cbd5e0' }}
                            formatter={(value: number, name: string) => [`${value.toFixed(2)} ${unit}`, name]}
                        />
                        <Legend wrapperStyle={{fontSize: "12px"}} />
                        {dataKeys.map(config => (
                             <Line
                                key={config.key}
                                type="monotone"
                                dataKey={config.key}
                                name={config.name}
                                stroke={config.color}
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 6 }}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
});

export default DataChart;