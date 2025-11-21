
export interface Refill {
  id: string;
  date: string;
  liters: number;
  pricePerLiter: number;
  totalCost: number;
}

export interface DailyLog {
  id: string;
  date: string;
  tempOutside: number;
  tempInside?: number;
  litersConsumed?: number; // Optional user estimate of consumption
  tankLevelReading?: number; // Optional exact reading from gauge
}

export interface TankConfig {
  capacity: number;
  currentLevel: number; // Estimated current liters
  lastUpdated: string;
  alarmThresholdDays: number; // Days remaining to trigger alarm
}

export interface AnalysisResult {
  predictedRunOutDate: string;
  daysRemaining: number;
  refillCosts: {
    cost500: number;
    cost1000: number;
    cost1500: number;
  };
  currentMarketPrice: number;
  weatherSummary: string;
  recommendation: string;
  consumptionTrend: 'stable' | 'increasing' | 'decreasing';
  sources?: { uri: string; title: string }[];
}

export enum AppStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS'
}
