import React, { useState, useEffect, useMemo } from 'react';
import { 
  Thermometer, 
  Droplets, 
  Wind, 
  Database, 
  Lightbulb, 
  Trash2, 
  Zap, 
  AlertTriangle, 
  Clock, 
  Wifi, 
  WifiOff,
  ChevronRight,
  LayoutDashboard,
  Settings,
  History as HistoryIcon,
  Bell,
  Terminal as TerminalIcon,
  Save,
  Trash
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { ref, onValue, set, push, serverTimestamp, query, limitToLast } from 'firebase/database';
import { db } from './firebase';
import { AppState, SensorData, Controls } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const INITIAL_STATE: AppState = {
  sensors: {
    temperature: 0,
    humidity: 0,
    ammonia: 0,
    feedDistance: 0,
    timestamp: Date.now(),
  },
  controls: {
    feed: false,
    stool: false,
    lights: false,
  },
  schedule: {
    lightsStart: '18:00',
    lightsEnd: '00:00',
    feedingInterval: 4,
  },
  history: [],
  logs: [],
  isConnected: false,
};

export default function App() {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'controls' | 'history' | 'alerts' | 'terminal'>('dashboard');

  const addLog = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const newLog = {
      id: Math.random().toString(36).substr(2, 9),
      message,
      timestamp: Date.now(),
      type
    };
    setState(prev => ({
      ...prev,
      logs: [newLog, ...prev.logs].slice(0, 50)
    }));
  };

  useEffect(() => {
    // Listen for sensors
    const sensorsRef = ref(db, 'sensors');
    const unsubscribeSensors = onValue(sensorsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setState(prev => ({
          ...prev,
          sensors: {
            ...data,
            timestamp: data.timestamp || Date.now()
          },
          isConnected: true
        }));
      }
    }, (error) => {
      console.error("Firebase error:", error);
      setState(prev => ({ ...prev, isConnected: false }));
      addLog("Firebase connection error", "error");
    });

    // Listen for controls
    const controlsRef = ref(db, 'controls');
    const unsubscribeControls = onValue(controlsRef, (snapshot) => {
      if (snapshot.exists()) {
        setState(prev => ({
          ...prev,
          controls: snapshot.val()
        }));
      }
    });

    // Listen for schedule
    const scheduleRef = ref(db, 'schedule');
    const unsubscribeSchedule = onValue(scheduleRef, (snapshot) => {
      if (snapshot.exists()) {
        setState(prev => ({
          ...prev,
          schedule: snapshot.val()
        }));
      }
    });

    // Listen for history (last 20 readings)
    const historyQuery = query(ref(db, 'history'), limitToLast(20));
    const unsubscribeHistory = onValue(historyQuery, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const historyArray = Object.values(data) as SensorData[];
        setState(prev => ({
          ...prev,
          history: historyArray.sort((a, b) => a.timestamp - b.timestamp)
        }));
      }
    });

    addLog("System initialized and connected to Firebase", "success");

    return () => {
      unsubscribeSensors();
      unsubscribeControls();
      unsubscribeSchedule();
      unsubscribeHistory();
    };
  }, []);

  const toggleControl = async (key: keyof Controls) => {
    const newValue = !state.controls[key];
    const label = key === 'feed' ? 'Auger Feeder' : key === 'stool' ? 'Stool Conveyor' : 'Lights';
    try {
      await set(ref(db, `controls/${key}`), newValue);
      addLog(`${label} toggled to ${newValue ? 'ON' : 'OFF'}`, "info");
    } catch (error) {
      console.error("Failed to update control:", error);
      addLog(`Failed to update ${label}`, "error");
    }
  };

  const updateSchedule = async (newSchedule: Partial<AppState['schedule']>) => {
    try {
      const updated = { ...state.schedule, ...newSchedule };
      await set(ref(db, 'schedule'), updated);
      addLog("Schedule updated successfully", "success");
    } catch (error) {
      addLog("Failed to update schedule", "error");
    }
  };

  const sensorStatus = useMemo(() => {
    const { temperature, humidity, ammonia, feedDistance } = state.sensors;
    const alerts = [];

    if (temperature > 35) alerts.push({ type: 'critical', message: 'High Temperature Detected!' });
    if (temperature < 20) alerts.push({ type: 'warning', message: 'Low Temperature Detected.' });
    if (ammonia > 20) alerts.push({ type: 'critical', message: 'Dangerous Ammonia Levels!' });
    if (feedDistance > 15) alerts.push({ type: 'warning', message: 'Low Feed Level.' });

    return {
      temp: temperature > 35 ? 'critical' : temperature > 30 ? 'warning' : 'normal',
      hum: humidity > 80 ? 'warning' : humidity < 40 ? 'warning' : 'normal',
      amm: ammonia > 20 ? 'critical' : ammonia > 10 ? 'warning' : 'normal',
      feed: feedDistance > 15 ? 'critical' : feedDistance > 10 ? 'warning' : 'normal',
      alerts
    };
  }, [state.sensors]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-red-500 bg-red-50 border-red-200';
      case 'warning': return 'text-amber-500 bg-amber-50 border-amber-200';
      default: return 'text-emerald-500 bg-emerald-50 border-emerald-200';
    }
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-black/5 backdrop-blur-md bg-white/80">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
              <Zap className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Smart Quail</h1>
              <p className="text-[10px] uppercase tracking-wider text-black/40 font-semibold">Backyard Farming IoT</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-500",
              state.isConnected ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"
            )}>
              {state.isConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {state.isConnected ? "Connected" : "Offline"}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 pb-24 lg:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sidebar Navigation (Desktop) */}
          <nav className="hidden lg:block lg:col-span-3 space-y-2">
            <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard />} label="Dashboard" />
            <NavButton active={activeTab === 'controls'} onClick={() => setActiveTab('controls')} icon={<Settings />} label="Controls" />
            <NavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<HistoryIcon />} label="Analytics" />
            <NavButton active={activeTab === 'alerts'} onClick={() => setActiveTab('alerts')} icon={<Bell />} label="Alerts" badge={sensorStatus.alerts.length} />
            <NavButton active={activeTab === 'terminal'} onClick={() => setActiveTab('terminal')} icon={<TerminalIcon />} label="Terminal" />
          </nav>

          {/* Main Content Area */}
          <div className="lg:col-span-9 space-y-8">
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && (
                <motion.div 
                  key="dashboard"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  {/* Real-time Sensors Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <SensorCard 
                      title="Temperature" 
                      value={`${state.sensors.temperature}°C`} 
                      icon={<Thermometer />} 
                      status={sensorStatus.temp}
                      trend="+0.2 from last hour"
                    />
                    <SensorCard 
                      title="Humidity" 
                      value={`${state.sensors.humidity}%`} 
                      icon={<Droplets />} 
                      status={sensorStatus.hum}
                    />
                    <SensorCard 
                      title="Ammonia" 
                      value={`${state.sensors.ammonia} ppm`} 
                      icon={<Wind />} 
                      status={sensorStatus.amm}
                    />
                    <SensorCard 
                      title="Feed Level" 
                      value={`${Math.max(0, 100 - (state.sensors.feedDistance * 5))}%`} 
                      icon={<Database />} 
                      status={sensorStatus.feed}
                    />
                  </div>

                  {/* Quick Controls & Schedule */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-lg">Quick Controls</h3>
                        <span className="text-[10px] font-bold text-black/30 uppercase tracking-widest">Manual Override</span>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        <ControlButton 
                          active={state.controls.feed} 
                          onClick={() => toggleControl('feed')} 
                          icon={<Zap />} 
                          label="Auger Feeder" 
                          sublabel="Activate Feeding"
                        />
                        <ControlButton 
                          active={state.controls.stool} 
                          onClick={() => toggleControl('stool')} 
                          icon={<Trash2 />} 
                          label="Stool Conveyor" 
                          sublabel="Clean Cages"
                        />
                        <ControlButton 
                          active={state.controls.lights} 
                          onClick={() => toggleControl('lights')} 
                          icon={<Lightbulb />} 
                          label="Lights Control" 
                          sublabel="Toggle Lighting"
                          isToggle
                        />
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-lg">Automation</h3>
                        <Clock className="w-5 h-5 text-black/20" />
                      </div>
                      <div className="space-y-4">
                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Lights Schedule</p>
                            <p className="text-sm font-medium text-emerald-900">{state.schedule.lightsStart} – {state.schedule.lightsEnd}</p>
                          </div>
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                        <div className="space-y-3">
                          <ThresholdItem label="Fan Activation" value="> 32°C" />
                          <ThresholdItem label="Heater Activation" value="< 24°C" />
                          <ThresholdItem label="Ammonia Purge" value="> 15 ppm" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mini Chart */}
                  <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-lg">Temperature Trend</h3>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                        <span className="text-xs font-medium text-black/60">Live Readings</span>
                      </div>
                    </div>
                    <div className="h-[240px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={state.history}>
                          <defs>
                            <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis 
                            dataKey="timestamp" 
                            tickFormatter={formatTime} 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fill: '#999' }}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fill: '#999' }}
                            domain={['auto', 'auto']}
                          />
                          <Tooltip 
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            labelFormatter={(label) => new Date(label).toLocaleString()}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="temperature" 
                            stroke="#10b981" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorTemp)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'controls' && (
                <motion.div 
                  key="controls"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  {/* Detailed Controls could go here */}
                  <div className="bg-white p-8 rounded-3xl border border-black/5 shadow-sm col-span-full">
                    <h2 className="text-2xl font-bold mb-6">System Controls</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                       <ControlCard 
                        title="Auger Feeder" 
                        description="Manually trigger the feed dispenser for 5 seconds."
                        icon={<Zap />}
                        active={state.controls.feed}
                        onClick={() => toggleControl('feed')}
                       />
                       <ControlCard 
                        title="Stool Conveyor" 
                        description="Run the cleaning belt to remove waste from cages."
                        icon={<Trash2 />}
                        active={state.controls.stool}
                        onClick={() => toggleControl('stool')}
                       />
                       <ControlCard 
                        title="Main Lighting" 
                        description="Toggle the overhead LED lights for the quail house."
                        icon={<Lightbulb />}
                        active={state.controls.lights}
                        onClick={() => toggleControl('lights')}
                        isToggle
                       />
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'history' && (
                <motion.div 
                  key="history"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  className="space-y-6"
                >
                  <div className="bg-white p-8 rounded-3xl border border-black/5 shadow-sm">
                    <h2 className="text-2xl font-bold mb-8">Environmental Analytics</h2>
                    <div className="space-y-12">
                      <ChartSection title="Temperature & Humidity" data={state.history} keys={['temperature', 'humidity']} colors={['#f59e0b', '#3b82f6']} />
                      <ChartSection title="Ammonia Levels (ppm)" data={state.history} keys={['ammonia']} colors={['#ef4444']} />
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'alerts' && (
                <motion.div 
                  key="alerts"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  <h2 className="text-2xl font-bold mb-6">System Alerts</h2>
                  {sensorStatus.alerts.length === 0 ? (
                    <div className="bg-emerald-50 border border-emerald-100 p-12 rounded-3xl text-center">
                      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Zap className="text-emerald-600 w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-bold text-emerald-900">All Systems Normal</h3>
                      <p className="text-emerald-600">No critical alerts detected at this time.</p>
                    </div>
                  ) : (
                    sensorStatus.alerts.map((alert, i) => (
                      <div key={i} className={cn(
                        "p-6 rounded-3xl border flex items-start gap-4",
                        alert.type === 'critical' ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100"
                      )}>
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                          alert.type === 'critical' ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                        )}>
                          <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className={cn("font-bold", alert.type === 'critical' ? "text-red-900" : "text-amber-900")}>
                            {alert.type === 'critical' ? 'Critical Alert' : 'Warning'}
                          </h4>
                          <p className={cn("text-sm", alert.type === 'critical' ? "text-red-600" : "text-amber-600")}>
                            {alert.message}
                          </p>
                          <p className="text-[10px] uppercase font-bold mt-2 opacity-40">Just now</p>
                        </div>
                      </div>
                    ))
                  )}
                </motion.div>
              )}

              {activeTab === 'terminal' && (
                <motion.div 
                  key="terminal"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="space-y-6"
                >
                  <div className="bg-[#0D0D0D] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                    <div className="bg-white/5 px-6 py-4 flex items-center justify-between border-b border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-red-500/50" />
                          <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                          <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
                        </div>
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-2">System Terminal</span>
                      </div>
                      <button 
                        onClick={() => setState(prev => ({ ...prev, logs: [] }))}
                        className="text-white/40 hover:text-white transition-colors"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-6 h-[500px] overflow-y-auto font-mono text-sm space-y-2 custom-scrollbar">
                      {state.logs.length === 0 ? (
                        <p className="text-white/20 italic">Waiting for system events...</p>
                      ) : (
                        state.logs.map((log) => (
                          <div key={log.id} className="flex gap-4 group">
                            <span className="text-white/20 shrink-0">[{formatTime(log.timestamp)}]</span>
                            <span className={cn(
                              "font-medium",
                              log.type === 'success' ? "text-emerald-400" :
                              log.type === 'warning' ? "text-amber-400" :
                              log.type === 'error' ? "text-red-400" :
                              "text-blue-400"
                            )}>
                              {log.type.toUpperCase()}:
                            </span>
                            <span className="text-white/80">{log.message}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-3xl border border-black/5 shadow-sm">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-emerald-600" />
                      Schedule Manager
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Lights Start</label>
                        <input 
                          type="time" 
                          value={state.schedule.lightsStart}
                          onChange={(e) => updateSchedule({ lightsStart: e.target.value })}
                          className="w-full p-3 rounded-xl bg-black/5 border-none font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Lights End</label>
                        <input 
                          type="time" 
                          value={state.schedule.lightsEnd}
                          onChange={(e) => updateSchedule({ lightsEnd: e.target.value })}
                          className="w-full p-3 rounded-xl bg-black/5 border-none font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Feed Interval (Hrs)</label>
                        <select 
                          value={state.schedule.feedingInterval}
                          onChange={(e) => updateSchedule({ feedingInterval: parseInt(e.target.value) })}
                          className="w-full p-3 rounded-xl bg-black/5 border-none font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
                        >
                          {[1, 2, 3, 4, 6, 8, 12, 24].map(h => (
                            <option key={h} value={h}>{h} Hours</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-black/5 px-6 py-3 flex items-center justify-between z-50 pb-safe">
        <MobileNavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard />} />
        <MobileNavButton active={activeTab === 'controls'} onClick={() => setActiveTab('dashboard')} icon={<Settings />} />
        <MobileNavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<HistoryIcon />} />
        <MobileNavButton active={activeTab === 'terminal'} onClick={() => setActiveTab('terminal')} icon={<TerminalIcon />} />
        <MobileNavButton active={activeTab === 'alerts'} onClick={() => setActiveTab('alerts')} icon={<Bell />} badge={sensorStatus.alerts.length} />
      </nav>

      {/* Footer Timestamp */}
      <footer className="max-w-7xl mx-auto px-4 py-8 text-center text-black/20 text-[10px] font-bold uppercase tracking-[0.2em] mb-20 lg:mb-0">
        Last Sync: {new Date(state.sensors.timestamp).toLocaleString()} • Smart-IoT Quail v1.0
      </footer>
    </div>
  );
}

function NavButton({ active, onClick, icon, label, badge }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, badge?: number }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-200 group",
        active ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" : "hover:bg-black/5 text-black/60"
      )}
    >
      <div className="flex items-center gap-3">
        {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5" })}
        <span className="font-bold text-sm tracking-tight">{label}</span>
      </div>
      {badge ? (
        <span className={cn(
          "text-[10px] font-black px-2 py-0.5 rounded-full",
          active ? "bg-white text-emerald-600" : "bg-red-500 text-white"
        )}>
          {badge}
        </span>
      ) : (
        <ChevronRight className={cn("w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity", active && "opacity-100")} />
      )}
    </button>
  );
}

function MobileNavButton({ active, onClick, icon, badge }: { active: boolean, onClick: () => void, icon: React.ReactNode, badge?: number }) {
  return (
    <button onClick={onClick} className="relative p-2">
      {React.cloneElement(icon as React.ReactElement, { 
        className: cn("w-6 h-6 transition-colors", active ? "text-emerald-600" : "text-black/30") 
      })}
      {badge ? (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white">
          {badge}
        </span>
      ) : null}
      {active && (
        <motion.div layoutId="mobile-nav-indicator" className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-600 rounded-full" />
      )}
    </button>
  );
}

function SensorCard({ title, value, icon, status, trend }: { title: string, value: string, icon: React.ReactNode, status: string, trend?: string }) {
  const colors = {
    normal: "text-emerald-600 bg-emerald-50 border-emerald-100",
    warning: "text-amber-600 bg-amber-50 border-amber-100",
    critical: "text-red-600 bg-red-50 border-red-100"
  };

  return (
    <div className="bg-white p-5 rounded-3xl border border-black/5 shadow-sm hover:shadow-md transition-shadow group">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-colors", colors[status as keyof typeof colors])}>
          {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5" })}
        </div>
        <div className={cn(
          "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
          colors[status as keyof typeof colors]
        )}>
          {status}
        </div>
      </div>
      <h4 className="text-black/40 text-[10px] font-bold uppercase tracking-widest mb-1">{title}</h4>
      <p className="text-2xl font-black tracking-tight">{value}</p>
      {trend && <p className="text-[10px] font-medium text-black/30 mt-2">{trend}</p>}
    </div>
  );
}

function ControlButton({ active, onClick, icon, label, sublabel, isToggle }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, sublabel: string, isToggle?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full p-4 rounded-2xl border flex items-center justify-between transition-all active:scale-95",
        active 
          ? "bg-black text-white border-black shadow-xl shadow-black/10" 
          : "bg-white text-black border-black/5 hover:border-black/20"
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center",
          active ? "bg-white/10" : "bg-black/5"
        )}>
          {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5" })}
        </div>
        <div className="text-left">
          <p className="text-sm font-bold leading-none mb-1">{label}</p>
          <p className={cn("text-[10px] font-medium opacity-50 uppercase tracking-wider")}>{sublabel}</p>
        </div>
      </div>
      <div className={cn(
        "w-10 h-5 rounded-full relative transition-colors",
        active ? "bg-emerald-500" : "bg-black/10"
      )}>
        <div className={cn(
          "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
          active ? "right-1" : "left-1"
        )} />
      </div>
    </button>
  );
}

function ControlCard({ title, description, icon, active, onClick, isToggle }: { title: string, description: string, icon: React.ReactNode, active: boolean, onClick: () => void, isToggle?: boolean }) {
  return (
    <div className={cn(
      "p-6 rounded-3xl border transition-all",
      active ? "bg-emerald-600 text-white border-emerald-500 shadow-xl shadow-emerald-200" : "bg-white border-black/5"
    )}>
      <div className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center mb-6",
        active ? "bg-white/20" : "bg-black/5"
      )}>
        {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6" })}
      </div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className={cn("text-xs mb-6 leading-relaxed", active ? "text-white/80" : "text-black/50")}>{description}</p>
      <button 
        onClick={onClick}
        className={cn(
          "w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95",
          active ? "bg-white text-emerald-600" : "bg-black text-white"
        )}
      >
        {active ? (isToggle ? 'Turn Off' : 'Running...') : (isToggle ? 'Turn On' : 'Activate')}
      </button>
    </div>
  );
}

function ThresholdItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-black/5 last:border-0">
      <span className="text-xs font-medium text-black/60">{label}</span>
      <span className="text-xs font-bold text-black/90">{value}</span>
    </div>
  );
}

function ChartSection({ title, data, keys, colors }: { title: string, data: any[], keys: string[], colors: string[] }) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-bold text-black/40 uppercase tracking-widest">{title}</h4>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={(ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#999' }}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#999' }}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
            />
            {keys.map((key, i) => (
              <Line 
                key={key}
                type="monotone" 
                dataKey={key} 
                stroke={colors[i]} 
                strokeWidth={3} 
                dot={false}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
