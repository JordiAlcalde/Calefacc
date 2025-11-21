import React from 'react';
import { AnalysisResult, AppStatus, TankConfig } from '../types';
import { TrendingUp, AlertTriangle, CloudSun, BellRing } from 'lucide-react';

interface AnalysisPanelProps {
  status: AppStatus;
  result: AnalysisResult | null;
  tankConfig: TankConfig;
  onAnalyze: () => void;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ status, result, tankConfig, onAnalyze }) => {
  const isLoading = status === AppStatus.ANALYZING;

  // Alarm Logic
  const isAlarmActive = result && result.daysRemaining <= tankConfig.alarmThresholdDays;

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-100 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-indigo-600" />
            Previsió Intel·ligent
          </h2>
          <p className="text-sm text-indigo-700 mt-1">
            Anàlisi meteorològic amb Gemini 3 Pro
          </p>
        </div>
        <button
          onClick={onAnalyze}
          disabled={isLoading}
          className={`px-6 py-2.5 rounded-lg font-medium transition-all shadow-md flex items-center gap-2
            ${isLoading 
              ? 'bg-indigo-300 cursor-not-allowed text-white' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-lg active:transform active:scale-95'
            }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analitzant Clima...
            </>
          ) : (
            <>
              <CloudSun className="w-4 h-4" />
              Actualitzar Previsió
            </>
          )}
        </button>
      </div>

      {status === AppStatus.ERROR && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p>Hi ha hagut un error connectant amb Gemini. Si us plau, torna-ho a provar.</p>
        </div>
      )}

      {isAlarmActive && (
        <div className="mb-6 bg-red-100 border-l-4 border-red-500 p-4 rounded-r-lg animate-pulse">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <BellRing className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-bold text-red-800">ALARMA DE SUBMINISTRAMENT</h3>
              <div className="mt-1 text-sm text-red-700">
                <p>
                  Et queden menys de {Math.round(result!.daysRemaining)} dies de combustible! 
                  Es recomana programar un reabastament abans del <strong>{new Date(result!.predictedRunOutDate).toLocaleDateString('ca-ES')}</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Card 1: Estimated Run Out */}
          <div className={`p-4 rounded-lg shadow-sm border ${isAlarmActive ? 'bg-red-50 border-red-200' : 'bg-white border-indigo-100'}`}>
            <div className="text-sm text-slate-500 mb-1">S'acaba el (aprox)</div>
            <div className={`text-2xl font-bold ${isAlarmActive ? 'text-red-700' : 'text-slate-900'}`}>
              {new Date(result.predictedRunOutDate).toLocaleDateString('ca-ES', { day: 'numeric', month: 'long' })}
            </div>
            <div className={`text-xs font-medium mt-2 px-2 py-1 rounded-full inline-block ${result.daysRemaining < 15 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              Queden {Math.round(result.daysRemaining)} dies
            </div>
          </div>

          {/* Card 2: Cost Forecasts (Multiple Scenarios) */}
          <div className="bg-white p-3 rounded-lg shadow-sm border border-indigo-100 flex flex-col justify-center">
            <div className="text-xs text-slate-500 mb-2 flex justify-between items-center">
               <span>Costos Estimats</span>
               <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">{result.currentMarketPrice.toFixed(3)} €/L</span>
            </div>
            <div className="space-y-1.5">
               <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-1">
                  <span className="text-slate-500 text-xs">500 L</span> 
                  <span className="font-bold text-slate-900">{result.refillCosts.cost500.toFixed(0)} €</span>
               </div>
               <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-1">
                  <span className="text-slate-500 text-xs">1000 L</span> 
                  <span className="font-bold text-slate-900">{result.refillCosts.cost1000.toFixed(0)} €</span>
               </div>
               <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 text-xs">1500 L</span> 
                  <span className="font-bold text-slate-900">{result.refillCosts.cost1500.toFixed(0)} €</span>
               </div>
            </div>
          </div>

          {/* Card 3: Weather Context */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-indigo-100 md:col-span-2">
            <div className="text-sm text-slate-500 mb-1 flex justify-between">
               <span>Previsió Meteorològica (Sant Hipòlit)</span>
               <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded uppercase tracking-wider">{result.consumptionTrend}</span>
            </div>
            <p className="text-slate-800 text-sm mt-1 leading-relaxed">
              {result.weatherSummary}
            </p>
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-sm font-medium text-indigo-700 flex items-start gap-2">
                <span className="mt-1">💡</span>
                {result.recommendation}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {!result && !isLoading && status !== AppStatus.ERROR && (
        <div className="text-center py-8 text-indigo-400">
          Prem "Actualitzar Previsió" per consultar el temps a Sant Hipòlit i calcular el consum.
        </div>
      )}
    </div>
  );
};

export default AnalysisPanel;