import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Bar,
  Scatter
} from 'recharts';
import { Refill, DailyLog } from '../types';

interface HistoryChartProps {
  refills: Refill[];
  logs: DailyLog[];
}

const HistoryChart: React.FC<HistoryChartProps> = ({ refills, logs }) => {
  const [activeTab, setActiveTab] = useState<'refills' | 'temp'>('refills');

  // Prepare Refill Data mixed with Readings
  const sortedRefills = [...refills].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // We want to show Tank Readings on the same chart as Refills to compare scale
  // Filter logs that have a reading
  const readingLogs = logs
    .filter(log => log.tankLevelReading !== undefined)
    .map(log => ({
      date: log.date,
      tankLevelReading: log.tankLevelReading,
      type: 'reading'
    }));

  const combinedData = [
    ...sortedRefills.map(r => ({ ...r, type: 'refill' })),
    ...readingLogs
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
   .map(item => ({
     ...item,
     formattedDate: new Date(item.date).toLocaleDateString('ca-ES', { month: 'short', year: '2-digit' }),
   }));

  // Prepare Temperature Data
  const sortedLogs = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const formattedLogs = sortedLogs.map(item => ({
    ...item,
    formattedDate: new Date(item.date).toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit' }),
  }));

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-slate-800">Gràfiques i Estadístiques</h3>
        <div className="flex bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('refills')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${activeTab === 'refills' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Estat del Tanc
          </button>
          <button
            onClick={() => setActiveTab('temp')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${activeTab === 'temp' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Temp. i Consum
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          {activeTab === 'refills' ? (
            <ComposedChart
              data={combinedData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="formattedDate" stroke="#64748b" fontSize={12} />
              <YAxis yAxisId="left" stroke="#64748b" fontSize={12} label={{ value: 'Litres', angle: -90, position: 'insideLeft' }} />
              <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={12} label={{ value: '€ / Litre', angle: 90, position: 'insideRight' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                formatter={(value: number, name: string) => {
                  if (name === 'pricePerLiter') return [`${value.toFixed(3)} €`, 'Preu'];
                  if (name === 'liters') return [`${value} L`, 'Aprovisionament'];
                  if (name === 'tankLevelReading') return [`${value} L`, 'Lectura Real'];
                  return [value, name];
                }}
              />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="liters" name="Aprovisionament" stroke="#f97316" activeDot={{ r: 8 }} strokeWidth={2} connectNulls={false} />
              <Line yAxisId="left" type="monotone" dataKey="tankLevelReading" name="Lectura Real" stroke="#4f46e5" strokeWidth={0} dot={{ r: 6, fill: "#4f46e5" }} activeDot={{ r: 8 }} />
              <Line yAxisId="right" type="monotone" dataKey="pricePerLiter" name="Preu/L" stroke="#3b82f6" strokeWidth={2} connectNulls={true} />
            </ComposedChart>
          ) : (
            <ComposedChart
              data={formattedLogs}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="formattedDate" stroke="#64748b" fontSize={12} />
              <YAxis yAxisId="left" stroke="#64748b" fontSize={12} label={{ value: 'Temperatura (°C)', angle: -90, position: 'insideLeft' }} />
              <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={12} label={{ value: 'Consum Est. (L)', angle: 90, position: 'insideRight' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
              />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="tempOutside" name="Temp. Exterior" stroke="#0ea5e9" strokeWidth={2} dot={false} />
              <Line yAxisId="left" type="monotone" dataKey="tempInside" name="Temp. Interior" stroke="#ef4444" strokeWidth={2} strokeDasharray="3 3" dot={false} />
              <Bar yAxisId="right" dataKey="litersConsumed" name="Consum (L)" fill="#cbd5e1" opacity={0.5} />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>
      {activeTab === 'temp' && logs.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 text-slate-500">
          Afegeix dades de temperatura per veure aquest gràfic.
        </div>
      )}
    </div>
  );
};

export default HistoryChart;