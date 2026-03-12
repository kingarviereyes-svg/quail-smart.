export interface SensorData {
  temperature: number;
  humidity: number;
  ammonia: number;
  feedDistance: number;
  timestamp: number;
}

export interface Controls {
  feed: boolean;
  stool: boolean;
  lights: boolean;
}

export interface Schedule {
  lightsStart: string;
  lightsEnd: string;
  feedingInterval: number;
}

export interface LogEntry {
  id: string;
  message: string;
  timestamp: number;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface AppState {
  sensors: SensorData;
  controls: Controls;
  schedule: Schedule;
  history: SensorData[];
  logs: LogEntry[];
  isConnected: boolean;
}
