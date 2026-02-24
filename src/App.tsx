/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Thermometer, 
  Droplets, 
  Wind, 
  Database, 
  Power, 
  Clock, 
  Settings, 
  Bell, 
  ChevronRight, 
  AlertCircle,
  Zap,
  Lightbulb,
  Trash2,
  CircleDot
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, off } from 'firebase/database';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';

// ---------- Firebase Config ----------
const firebaseConfig = {
  apiKey: "AIzaSyANHR5YCQrEQ-JG07mX-r38ht_7cWwsA8I",
  authDomain: "quail-67.firebaseapp.com",
  databaseURL: "https://quail-67-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "quail-67"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// ---------- Types ----------
interface Sensors {
  temperature: number;
  humidity: number;
  ammonia: number;
  feedLevel: number;
}

interface Controls {
  fan: boolean;
  heater: boolean;
  led: boolean;
  feed: boolean;
  stepper1: boolean;
  stepper2: boolean;
}

interface Schedule {
  egg_time: string;
  stool_time: string;
  feed_time: string;
  led_on: string;
  led_off: string;
}

interface LogEntry {
  id: string;
  time: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

export default function App() {
  const [sensors, setSensors] = useState<Sensors>({ temperature: 0, humidity: 0, ammonia: 0, feedLevel: 0 });
  const [controls, setControls] = useState<Controls>({ fan: false, heater: false, led: false, feed: false, stepper1: false, stepper2: false });
  const [schedule, setSchedule] = useState<Schedule>({ egg_time: '08:00', stool_time: '09:00', feed_time: '07:00', led_on: '06:00', led_off: '18:00' });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'schedule'>('dashboard');

  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auth setup
    onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
        addLog("User authenticated successfully", "success");
      } else {
        signInAnonymously(auth).catch(err => addLog("Auth error: " + err.message, "error"));
      }
    });

    // Real-time Listeners
    const sensorsRef = ref(db, 'sensors');
    onValue(sensorsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setSensors(data);
    });

    const controlsRef = ref(db, 'controls');
    onValue(controlsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setControls(data);
    });

    const scheduleRef = ref(db, 'schedule');
    onValue(scheduleRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setSchedule(data);
    });

    return () => {
      off(sensorsRef);
      off(controlsRef);
      off(scheduleRef);
    };
  }, []);

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      time: new Date().toLocaleTimeString(),
      message,
      type
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50));
    
    // Browser Notification
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("QuailSmart Update", { body: message });
    }
  };

  const toggleDevice = (device: keyof Controls, currentState: boolean) => {
    const newState = !currentState;
    set(ref(db, `controls/${device}`), newState)
      .then(() => addLog(`${device.toUpperCase()} turned ${newState ? 'ON' : 'OFF'}`, 'info'))
      .catch(err => addLog(`Failed to toggle ${device}: ${err.message}`, 'error'));
  };

  const triggerMomentary = (device: keyof Controls) => {
    set(ref(db, `controls/${device}`), true)
      .then(() => {
        addLog(`Activated ${device.toUpperCase()}`, 'success');
        setTimeout(() => {
          set(ref(db, `controls/${device}`), false);
        }, 5000);
      })
      .catch(err => addLog(`Failed to trigger ${device}: ${err.message}`, 'error'));
  };

  const saveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    set(ref(db, 'schedule'), schedule)
      .then(() => addLog("Schedule updated successfully", "success"))
      .catch(err => addLog("Failed to save schedule: " + err.message, "error"));
  };

  const getFeedStatus = (level: number) => {
    if (level < 20) return { label: 'LOW', color: 'text-red-500' };
    if (level < 60) return { label: 'MID', color: 'text-yellow-500' };
    return { label: 'FULL', color: 'text-emerald-500' };
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
            <Zap className="text-emerald-500 w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">QuailSmart</h1>
          <p className="text-zinc-400 text-sm">Connecting to secure farm network...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-300 font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Zap className="text-black w-5 h-5" />
            </div>
            <span className="font-bold text-white tracking-tight text-lg">QuailSmart</span>
          </div>
          
          <nav className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-full border border-zinc-800">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${activeTab === 'dashboard' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('schedule')}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${activeTab === 'schedule' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Schedule
            </button>
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">System Status</span>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs text-emerald-500 font-medium">Online</span>
              </div>
            </div>
            <button className="p-2 hover:bg-zinc-800 rounded-full transition-colors relative">
              <Bell className="w-5 h-5 text-zinc-400" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full border-2 border-black" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Sensors & Controls */}
        <div className="lg:col-span-8 space-y-8">
          
          {activeTab === 'dashboard' ? (
            <>
              {/* Sensors Grid */}
              <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <SensorCard 
                  icon={<Thermometer className="w-5 h-5 text-orange-400" />}
                  label="Temperature"
                  value={`${sensors.temperature.toFixed(1)}°C`}
                  trend="Stable"
                  color="orange"
                />
                <SensorCard 
                  icon={<Droplets className="w-5 h-5 text-blue-400" />}
                  label="Humidity"
                  value={`${sensors.humidity.toFixed(1)}%`}
                  trend="Optimal"
                  color="blue"
                />
                <SensorCard 
                  icon={<Wind className="w-5 h-5 text-purple-400" />}
                  label="Ammonia"
                  value={`${sensors.ammonia.toFixed(1)} ppm`}
                  trend={sensors.ammonia > 20 ? "High" : "Safe"}
                  color="purple"
                />
                <SensorCard 
                  icon={<Database className="w-5 h-5 text-emerald-400" />}
                  label="Feed Level"
                  value={`${sensors.feedLevel}%`}
                  trend={getFeedStatus(sensors.feedLevel).label}
                  color="emerald"
                />
              </section>

              {/* Main Controls */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-6 backdrop-blur-sm">
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Power className="w-4 h-4 text-emerald-500" />
                    Device Overrides
                  </h3>
                  <div className="space-y-4">
                    <ControlToggle 
                      label="Heating System" 
                      active={controls.heater} 
                      onToggle={() => toggleDevice('heater', controls.heater)} 
                      icon={<Thermometer className="w-4 h-4" />}
                    />
                    <ControlToggle 
                      label="Lighting (LED)" 
                      active={controls.led} 
                      onToggle={() => toggleDevice('led', controls.led)} 
                      icon={<Lightbulb className="w-4 h-4" />}
                    />
                    <ControlToggle 
                      label="Exhaust Fan" 
                      active={controls.fan} 
                      onToggle={() => toggleDevice('fan', controls.fan)} 
                      icon={<Wind className="w-4 h-4" />}
                    />
                  </div>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-6 backdrop-blur-sm">
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    Momentary Actions
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    <ActionButton 
                      label="Activate Feed Motor" 
                      onClick={() => triggerMomentary('feed')} 
                      description="5 second cycle"
                    />
                    <ActionButton 
                      label="Stool Stepper (M1)" 
                      onClick={() => triggerMomentary('stepper1')} 
                      description="30 second cycle"
                    />
                    <ActionButton 
                      label="Egg Stepper (M2)" 
                      onClick={() => triggerMomentary('stepper2')} 
                      description="30 second cycle"
                    />
                  </div>
                </div>
              </section>
            </>
          ) : (
            /* Schedule Tab */
            <motion.section 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-8 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">Automation Schedule</h3>
                  <p className="text-zinc-500 text-sm">Configure automated cycles for your farm.</p>
                </div>
                <Clock className="w-8 h-8 text-emerald-500/50" />
              </div>

              <form onSubmit={saveSchedule} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <TimeInput 
                    label="Egg Collection (Stepper 2)" 
                    value={schedule.egg_time} 
                    onChange={v => setSchedule({...schedule, egg_time: v})} 
                  />
                  <TimeInput 
                    label="Stool Cleaning (Stepper 1)" 
                    value={schedule.stool_time} 
                    onChange={v => setSchedule({...schedule, stool_time: v})} 
                  />
                  <TimeInput 
                    label="Feeding Cycle" 
                    value={schedule.feed_time} 
                    onChange={v => setSchedule({...schedule, feed_time: v})} 
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <TimeInput 
                      label="LED ON" 
                      value={schedule.led_on} 
                      onChange={v => setSchedule({...schedule, led_on: v})} 
                    />
                    <TimeInput 
                      label="LED OFF" 
                      value={schedule.led_off} 
                      onChange={v => setSchedule({...schedule, led_off: v})} 
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-zinc-800">
                  <button 
                    type="submit"
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    <Settings className="w-5 h-5" />
                    Save Automation Settings
                  </button>
                </div>
              </form>
            </motion.section>
          )}
        </div>

        {/* Right Column: Terminal Logs */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl flex flex-col h-[600px] backdrop-blur-sm overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-black/20">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <CircleDot className="w-4 h-4 text-emerald-500" />
                System Terminal
              </h3>
              <button 
                onClick={() => setLogs([])}
                className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
                title="Clear Logs"
              >
                <Trash2 className="w-4 h-4 text-zinc-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono text-xs custom-scrollbar">
              <AnimatePresence initial={false}>
                {logs.length === 0 ? (
                  <div className="text-zinc-600 italic text-center py-20">No system activity logged yet.</div>
                ) : (
                  logs.map((log) => (
                    <motion.div 
                      key={log.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex gap-3 group"
                    >
                      <span className="text-zinc-600 shrink-0">{log.time}</span>
                      <span className={`shrink-0 font-bold ${
                        log.type === 'error' ? 'text-red-500' : 
                        log.type === 'success' ? 'text-emerald-500' : 
                        'text-blue-400'
                      }`}>
                        [{log.type.toUpperCase()}]
                      </span>
                      <span className="text-zinc-400 group-hover:text-zinc-200 transition-colors">{log.message}</span>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
              <div ref={logRef} />
            </div>
          </div>

          {/* Quick Stats / Info */}
          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-emerald-500" />
              <h4 className="text-sm font-bold text-white">Maintenance Tip</h4>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Ensure the MQ-137 sensor is calibrated weekly for accurate ammonia detection. 
              High levels (&gt;25ppm) can affect quail respiratory health.
            </p>
          </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-8 border-t border-zinc-800/50 mt-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-zinc-500 text-[10px] uppercase tracking-widest font-medium">
          QuailSmart v2.4.0 • Enterprise Farm Management
        </div>
        <div className="flex items-center gap-6">
          <a href="#" className="text-zinc-500 hover:text-emerald-500 transition-colors text-xs">Documentation</a>
          <a href="#" className="text-zinc-500 hover:text-emerald-500 transition-colors text-xs">Support</a>
          <a href="#" className="text-zinc-500 hover:text-emerald-500 transition-colors text-xs">API</a>
        </div>
      </footer>
    </div>
  );
}

// ---------- Sub-components ----------

function SensorCard({ icon, label, value, trend, color }: { icon: React.ReactNode, label: string, value: string, trend: string, color: string }) {
  const colorMap: Record<string, string> = {
    orange: 'from-orange-500/10 to-transparent border-orange-500/20',
    blue: 'from-blue-500/10 to-transparent border-blue-500/20',
    purple: 'from-purple-500/10 to-transparent border-purple-500/20',
    emerald: 'from-emerald-500/10 to-transparent border-emerald-500/20',
  };

  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} bg-zinc-900/40 border rounded-3xl p-5 backdrop-blur-sm hover:translate-y-[-2px] transition-all duration-300`}>
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-zinc-800 rounded-xl">
          {icon}
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-zinc-800 rounded-md ${
          trend === 'High' ? 'text-red-400' : 'text-zinc-400'
        }`}>
          {trend}
        </span>
      </div>
      <div className="space-y-1">
        <p className="text-zinc-500 text-xs font-medium">{label}</p>
        <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function ControlToggle({ label, active, onToggle, icon }: { label: string, active: boolean, onToggle: () => void, icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-2xl border border-zinc-800/50 hover:border-zinc-700 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${active ? 'bg-emerald-500/20 text-emerald-500' : 'bg-zinc-800 text-zinc-500'}`}>
          {icon}
        </div>
        <span className={`text-sm font-medium ${active ? 'text-white' : 'text-zinc-400'}`}>{label}</span>
      </div>
      <button 
        onClick={onToggle}
        className={`w-12 h-6 rounded-full transition-all relative ${active ? 'bg-emerald-500' : 'bg-zinc-700'}`}
      >
        <motion.div 
          animate={{ x: active ? 26 : 4 }}
          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
        />
      </button>
    </div>
  );
}

function ActionButton({ label, onClick, description }: { label: string, onClick: () => void, description: string }) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-2xl border border-zinc-800/50 hover:bg-zinc-800/50 hover:border-emerald-500/30 transition-all group"
    >
      <div className="text-left">
        <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{label}</p>
        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-0.5">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-500 transition-colors" />
    </button>
  );
}

function TimeInput({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">{label}</label>
      <div className="relative">
        <input 
          type="time" 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none"
        />
        <Clock className="absolute right-4 top-3.5 w-4 h-4 text-zinc-500 pointer-events-none" />
      </div>
    </div>
  );
}
