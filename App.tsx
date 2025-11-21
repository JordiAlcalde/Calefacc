import React, { useState, useEffect } from 'react';
import { Refill, TankConfig, AnalysisResult, AppStatus, DailyLog } from './types';
import { analyzeConsumption } from './services/geminiService';
import HistoryChart from './components/HistoryChart';
import AnalysisPanel from './components/AnalysisPanel';
import { Plus, Settings, Flame, Save, X, Thermometer, FileText, Gauge, Pencil, Trash2 } from 'lucide-react';

const INITIAL_TANK_CONFIG: TankConfig = {
  capacity: 1500,
  currentLevel: 375, // Updated to match the latest reading
  lastUpdated: new Date().toISOString(),
  alarmThresholdDays: 20 
};

const SAMPLE_REFILLS: Refill[] = [
  { id: '1', date: '2025-10-23', liters: 530, pricePerLiter: 0.95, totalCost: 503.5 },
];

const SAMPLE_LOGS: DailyLog[] = [
  {
    id: 'manual-1',
    date: '2025-11-21',
    tempOutside: 8.5, // Estimació de temperatura per la data
    tankLevelReading: 375
  }
];

export default function App() {
  // State
  const [refills, setRefills] = useState<Refill[]>(() => {
    const saved = localStorage.getItem('calefacc_refills');
    return saved ? JSON.parse(saved) : SAMPLE_REFILLS;
  });

  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>(() => {
    const saved = localStorage.getItem('calefacc_logs');
    return saved ? JSON.parse(saved) : SAMPLE_LOGS;
  });

  const [tankConfig, setTankConfig] = useState<TankConfig>(() => {
    const saved = localStorage.getItem('calefacc_config');
    return saved ? JSON.parse(saved) : INITIAL_TANK_CONFIG;
  });

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [appStatus, setAppStatus] = useState<AppStatus>(AppStatus.IDLE);
  
  // UI State for Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Editing State
  const [editingRefillId, setEditingRefillId] = useState<string | null>(null);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);

  // Form States
  const [newRefill, setNewRefill] = useState({ liters: '', price: '', date: new Date().toISOString().split('T')[0] });
  const [newLog, setNewLog] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    tempOut: '', 
    tempIn: '21', 
    consumption: '',
    reading: '' 
  });
  const [settingsForm, setSettingsForm] = useState({ capacity: '', currentLevel: '', alarmThreshold: '' });

  // Effects
  useEffect(() => {
    localStorage.setItem('calefacc_refills', JSON.stringify(refills));
  }, [refills]);

  useEffect(() => {
    localStorage.setItem('calefacc_logs', JSON.stringify(dailyLogs));
  }, [dailyLogs]);

  useEffect(() => {
    localStorage.setItem('calefacc_config', JSON.stringify(tankConfig));
  }, [tankConfig]);

  // Handlers
  const handleAnalyze = async () => {
    setAppStatus(AppStatus.ANALYZING);
    try {
      const result = await analyzeConsumption(refills, dailyLogs, tankConfig);
      setAnalysis(result);
      setAppStatus(AppStatus.SUCCESS);
    } catch (e) {
      setAppStatus(AppStatus.ERROR);
    }
  };

  // --- Refill Management ---

  const openRefillModal = (refill?: Refill) => {
    if (refill) {
      setEditingRefillId(refill.id);
      setNewRefill({
        date: refill.date,
        liters: refill.liters.toString(),
        price: refill.pricePerLiter.toString()
      });
    } else {
      setEditingRefillId(null);
      setNewRefill({ liters: '', price: '', date: new Date().toISOString().split('T')[0] });
    }
    setIsAddModalOpen(true);
  };

  const handleSaveRefill = (e: React.FormEvent) => {
    e.preventDefault();
    const liters = parseFloat(newRefill.liters);
    const price = parseFloat(newRefill.price);
    
    if (isNaN(liters) || isNaN(price)) return;

    if (editingRefillId) {
      // Edit Mode
      setRefills(prev => prev.map(r => {
        if (r.id === editingRefillId) {
          return {
            ...r,
            date: newRefill.date,
            liters,
            pricePerLiter: price,
            totalCost: liters * price
          };
        }
        return r;
      }));
    } else {
      // Add Mode
      const entry: Refill = {
        id: Date.now().toString(),
        date: newRefill.date,
        liters,
        pricePerLiter: price,
        totalCost: liters * price
      };
      setRefills([...refills, entry]);
      
      // Update tank level only on ADD, not edit (too complex to revert correctly)
      const newLevel = Math.min(tankConfig.capacity, tankConfig.currentLevel + liters);
      setTankConfig(prev => ({ ...prev, currentLevel: newLevel, lastUpdated: new Date().toISOString() }));
    }
    
    setIsAddModalOpen(false);
  };

  const handleDeleteRefill = (id: string) => {
    if (window.confirm("Estàs segur que vols eliminar aquest aprovisionament?")) {
      setRefills(prev => prev.filter(r => r.id !== id));
    }
  };

  // --- Log Management ---

  const openLogModal = (log?: DailyLog) => {
    if (log) {
      setEditingLogId(log.id);
      setNewLog({
        date: log.date,
        tempOut: log.tempOutside.toString(),
        tempIn: log.tempInside ? log.tempInside.toString() : '21',
        consumption: log.litersConsumed ? log.litersConsumed.toString() : '',
        reading: log.tankLevelReading ? log.tankLevelReading.toString() : ''
      });
    } else {
      setEditingLogId(null);
      setNewLog({ date: new Date().toISOString().split('T')[0], tempOut: '', tempIn: '21', consumption: '', reading: '' });
    }
    setIsLogModalOpen(true);
  };

  const handleSaveLog = (e: React.FormEvent) => {
    e.preventDefault();
    const tempOut = parseFloat(newLog.tempOut);
    const tempIn = parseFloat(newLog.tempIn);
    const cons = parseFloat(newLog.consumption);
    const reading = parseFloat(newLog.reading);

    if (isNaN(tempOut)) return;

    const entryData: Partial<DailyLog> = {
      date: newLog.date,
      tempOutside: tempOut,
      tempInside: isNaN(tempIn) ? undefined : tempIn,
      litersConsumed: isNaN(cons) ? undefined : cons,
      tankLevelReading: isNaN(reading) ? undefined : reading
    };

    if (editingLogId) {
      // Edit Mode
      setDailyLogs(prev => prev.map(l => l.id === editingLogId ? { ...l, ...entryData } as DailyLog : l));
    } else {
      // Add Mode
      const entry: DailyLog = {
        id: Date.now().toString(),
        ...entryData
      } as DailyLog;

      setDailyLogs([...dailyLogs, entry]);

      // Update tank level only on ADD
      if (!isNaN(reading)) {
         setTankConfig(prev => ({ ...prev, currentLevel: reading, lastUpdated: new Date().toISOString() }));
      } else if (!isNaN(cons)) {
         const newLevel = Math.max(0, tankConfig.currentLevel - cons);
         setTankConfig(prev => ({ ...prev, currentLevel: newLevel, lastUpdated: new Date().toISOString() }));
      }
    }

    setIsLogModalOpen(false);
  };

  const handleDeleteLog = (id: string) => {
    if (window.confirm("Estàs segur que vols eliminar aquest registre?")) {
      setDailyLogs(prev => prev.filter(l => l.id !== id));
    }
  };

  // --- Settings Management ---

  const handleUpdateSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const cap = parseFloat(settingsForm.capacity);
    const level = parseFloat(settingsForm.currentLevel);
    const alarm = parseFloat(settingsForm.alarmThreshold);

    if (!isNaN(cap) && !isNaN(level)) {
      setTankConfig({
        ...tankConfig,
        capacity: cap,
        currentLevel: level,
        alarmThresholdDays: isNaN(alarm) ? 20 : alarm,
        lastUpdated: new Date().toISOString()
      });
      setIsSettingsOpen(false);
    }
  };

  const openSettings = () => {
    setSettingsForm({
      capacity: tankConfig.capacity.toString(),
      currentLevel: tankConfig.currentLevel.toString(),
      alarmThreshold: tankConfig.alarmThresholdDays.toString()
    });
    setIsSettingsOpen(true);
  };

  // Derived state for tank visualization
  const tankPercentage = Math.min(100, Math.max(0, (tankConfig.currentLevel / tankConfig.capacity) * 100));
  const tankColor = tankPercentage < 20 ? 'bg-red-500' : tankPercentage < 40 ? 'bg-orange-500' : 'bg-green-500';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-orange-100 p-2 rounded-lg">
              <Flame className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-none">Calefacc</h1>
              <p className="text-xs text-slate-500">Sant Hipòlit de Voltregà</p>
            </div>
          </div>
          <button onClick={openSettings} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        
        {/* Tank Visualization */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
          <div className="p-6 relative z-10">
             <div className="flex justify-between items-end mb-2">
               <div>
                 <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Nivell del Tanc</h2>
                 <p className="text-4xl font-bold text-slate-900">{tankConfig.currentLevel.toFixed(0)} <span className="text-lg font-normal text-slate-400">/ {tankConfig.capacity} L</span></p>
               </div>
               <div className="text-right">
                 <p className="text-2xl font-bold text-slate-700">{tankPercentage.toFixed(0)}%</p>
               </div>
             </div>
             <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
               <div 
                 className={`h-full transition-all duration-1000 ease-out ${tankColor}`} 
                 style={{ width: `${tankPercentage}%` }}
               />
             </div>
          </div>
        </section>

        {/* Analysis Panel */}
        <AnalysisPanel 
          status={appStatus}
          result={analysis}
          tankConfig={tankConfig}
          onAnalyze={handleAnalyze}
        />

        {/* Main Charts */}
        <div className="h-80 md:h-96">
           <HistoryChart refills={refills} logs={dailyLogs} />
        </div>

        {/* Data Management Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Section: Refills */}
            <section className="flex flex-col h-full">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                   <FileText className="w-5 h-5 text-slate-500" />
                   Aprovisionaments
                 </h3>
                 <button 
                   onClick={() => openRefillModal()}
                   className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors shadow-sm"
                 >
                   <Plus className="w-4 h-4" />
                   Afegir
                 </button>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 max-h-64 overflow-y-auto overflow-x-auto">
                <table className="w-full text-sm text-left min-w-[340px]">
                  <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 z-10">
                    <tr>
                      <th className="px-2 md:px-4 py-2">Data</th>
                      <th className="px-2 md:px-4 py-2 text-right">Litres</th>
                      <th className="px-2 md:px-4 py-2 text-right">Preu</th>
                      <th className="px-2 py-2 w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {refills.length === 0 ? (
                       <tr><td colSpan={4} className="px-4 py-4 text-center text-slate-400 italic">Cap aprovisionament registrat</td></tr>
                    ) : (
                       refills.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((refill) => (
                        <tr key={refill.id} className="hover:bg-slate-50 group">
                          <td className="px-2 md:px-4 py-2 text-slate-900">{new Date(refill.date).toLocaleDateString('ca-ES')}</td>
                          <td className="px-2 md:px-4 py-2 text-right font-medium">{refill.liters} L</td>
                          <td className="px-2 md:px-4 py-2 text-right text-slate-500">{refill.pricePerLiter.toFixed(2)} €</td>
                          <td className="px-2 py-2 text-right flex items-center justify-end gap-1">
                            <button onClick={() => openRefillModal(refill)} className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteRefill(refill.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section: Daily Logs */}
            <section className="flex flex-col h-full">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                   <Thermometer className="w-5 h-5 text-slate-500" />
                   Lectures
                 </h3>
                 <button 
                   onClick={() => openLogModal()}
                   className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors shadow-sm"
                 >
                   <Plus className="w-4 h-4" />
                   Afegir
                 </button>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 max-h-64 overflow-y-auto overflow-x-auto">
                <table className="w-full text-sm text-left min-w-[340px]">
                  <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 z-10">
                    <tr>
                      <th className="px-2 py-2 w-24">Data</th>
                      <th className="px-2 py-2 w-16 text-center">Ext.</th>
                      <th className="px-2 py-2 text-right">Dada</th>
                      <th className="px-2 py-2 w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dailyLogs.length === 0 ? (
                       <tr><td colSpan={4} className="px-4 py-4 text-center text-slate-400 italic">Cap registre disponible</td></tr>
                    ) : (
                       dailyLogs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50 group">
                          <td className="px-2 py-2 text-slate-900 align-middle">{new Date(log.date).toLocaleDateString('ca-ES')}</td>
                          <td className="px-2 py-2 text-center align-middle">{log.tempOutside.toFixed(1)}°</td>
                          <td className="px-2 py-2 text-right text-slate-600 align-middle">
                            {log.tankLevelReading !== undefined 
                              ? <span className="font-bold text-indigo-600 inline-block">{log.tankLevelReading} L <span className="text-[10px] text-indigo-400 uppercase tracking-wider ml-1">Real</span></span> 
                              : log.litersConsumed ? `-${log.litersConsumed} L` : '-'}
                          </td>
                          <td className="px-2 py-2 text-right flex items-center justify-end gap-1">
                            <button onClick={() => openLogModal(log)} className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteLog(log.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
        </div>
      </main>

      {/* Modal: Add/Edit Refill */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-semibold text-slate-900">
                {editingRefillId ? 'Editar Aprovisionament' : 'Nou Aprovisionament'}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveRefill} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                <input 
                  type="date" 
                  required
                  value={newRefill.date}
                  onChange={e => setNewRefill({...newRefill, date: e.target.value})}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Litres</label>
                  <input 
                    type="number" step="1" min="1" required
                    value={newRefill.liters}
                    onChange={e => setNewRefill({...newRefill, liters: e.target.value})}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    placeholder="ex: 500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Preu (€/L)</label>
                  <input 
                    type="number" step="0.001" min="0" required
                    value={newRefill.price}
                    onChange={e => setNewRefill({...newRefill, price: e.target.value})}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    placeholder="ex: 1.25"
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />
                {editingRefillId ? 'Actualitzar' : 'Guardar'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Log */}
      {isLogModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-semibold text-slate-900">
                {editingLogId ? 'Editar Registre' : 'Afegir Registre Diari'}
              </h3>
              <button onClick={() => setIsLogModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveLog} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                <input 
                  type="date" 
                  required
                  value={newLog.date}
                  onChange={e => setNewLog({...newLog, date: e.target.value})}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Temp. Exterior (°C)</label>
                  <input 
                    type="number" step="0.1" required
                    value={newLog.tempOut}
                    onChange={e => setNewLog({...newLog, tempOut: e.target.value})}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    placeholder="ex: 12.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Temp. Interior (°C)</label>
                  <input 
                    type="number" step="0.1"
                    value={newLog.tempIn}
                    onChange={e => setNewLog({...newLog, tempIn: e.target.value})}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    placeholder="ex: 21"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 mt-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Omple'n només un (opcional)</p>
                
                <div className="space-y-4">
                  <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                    <label className="block text-sm font-medium text-indigo-900 mb-1 flex items-center gap-2">
                      <Gauge className="w-4 h-4" />
                      Lectura Real del Tanc (L)
                    </label>
                    <input 
                      type="number" step="1" min="0"
                      value={newLog.reading}
                      onChange={e => setNewLog({...newLog, reading: e.target.value, consumption: ''})}
                      className="w-full p-2 bg-white border border-indigo-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 placeholder:text-indigo-200"
                      placeholder="Nivell exacte si l'has mirat"
                    />
                  </div>

                  <div className="text-center text-slate-400 text-xs">- O -</div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Consum Estimat (L)</label>
                    <input 
                      type="number" step="0.1" min="0"
                      value={newLog.consumption}
                      onChange={e => setNewLog({...newLog, consumption: e.target.value, reading: ''})}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
                      placeholder="Estimació diària"
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 flex items-center justify-center gap-2 mt-2">
                <Save className="w-4 h-4" />
                {editingLogId ? 'Actualitzar' : 'Guardar'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Settings */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-semibold text-slate-900">Configuració Tanc</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateSettings} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Capacitat Total (L)</label>
                <input 
                  type="number" required
                  value={settingsForm.capacity}
                  onChange={e => setSettingsForm({...settingsForm, capacity: e.target.value})}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nivell Actual (L)</label>
                <input 
                  type="number" required
                  value={settingsForm.currentLevel}
                  onChange={e => setSettingsForm({...settingsForm, currentLevel: e.target.value})}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-slate-500 mt-1">Modifica això només si el càlcul automàtic és incorrecte.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Avisar quan quedin (dies)</label>
                <input 
                  type="number" required
                  value={settingsForm.alarmThreshold}
                  onChange={e => setSettingsForm({...settingsForm, alarmThreshold: e.target.value})}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />
                Guardar Configuració
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}