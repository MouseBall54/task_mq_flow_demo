/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Send, 
  Cpu, 
  Database, 
  CheckCircle2, 
  Activity, 
  ArrowRight, 
  Layers,
  Network,
  RefreshCw,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// Types
interface Message {
  id: string; // request_id
  imagePath: string;
  rcpPath: string;
  status: 'queued' | 'processing' | 'result-queued' | 'completed';
  workerId?: string;
  startTime?: number;
  endTime?: number;
}

interface Worker {
  id: string;
  ip: string;
  status: 'idle' | 'processing';
  currentJobId?: string;
}

export default function App() {
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([
    { id: 'w-1', ip: '192.168.1.101', status: 'idle' },
    { id: 'w-2', ip: '192.168.1.102', status: 'idle' },
    { id: 'w-3', ip: '104.22.1.20', status: 'idle' },
    { id: 'w-4', ip: '172.16.0.45', status: 'idle' },
    { id: 'w-5', ip: '10.0.0.12', status: 'idle' },
    { id: 'w-6', ip: '192.168.5.88', status: 'idle' },
    { id: 'w-7', ip: '45.77.12.3', status: 'idle' },
    { id: 'w-8', ip: '8.8.8.8', status: 'idle' },
  ]);
  const [requestQueue, setRequestQueue] = useState<Message[]>([]);
  const [resultQueue, setResultQueue] = useState<Message[]>([]);
  
  // Stats
  const processedCount = messages.filter(m => m.status === 'completed').length;
  const pendingCount = messages.filter(m => m.status !== 'completed').length;

  // Actions
  const addRequest = useCallback(() => {
    const requestId = `req-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const newMessage: Message = {
      id: requestId,
      imagePath: `/assets/images/img_${Math.floor(Math.random() * 1000)}.jpg`,
      rcpPath: `/config/default_${Math.floor(Math.random() * 10)}.rcp`,
      status: 'queued',
    };
    
    setMessages(prev => [...prev, newMessage]);
    setRequestQueue(prev => [...prev, newMessage]);
  }, []);

  const addMultipleRequests = useCallback(() => {
    const newMsgs: Message[] = [];
    for (let i = 0; i < 10; i++) {
      const requestId = `req-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      newMsgs.push({
        id: requestId,
        imagePath: `/assets/images/img_${Math.floor(Math.random() * 1000)}.jpg`,
        rcpPath: `/config/default_${Math.floor(Math.random() * 10)}.rcp`,
        status: 'queued',
      });
    }
    setMessages(prev => [...prev, ...newMsgs]);
    setRequestQueue(prev => [...prev, ...newMsgs]);
  }, []);

  const addWorker = useCallback(() => {
    const workerId = `w-${workers.length + 1}`;
    const ip = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    setWorkers(prev => [...prev, { id: workerId, ip, status: 'idle' }]);
  }, [workers.length]);

  // Simulation Logic: Workers consuming from Request Queue
  useEffect(() => {
    const timer = setInterval(() => {
      // Find idle workers and jobs in queue
      if (requestQueue.length === 0) return;

      setWorkers(currentWorkers => {
        const nextWorkers = [...currentWorkers];
        const nextQueue = [...requestQueue];
        
        let changed = false;
        
        for (let i = 0; i < nextWorkers.length; i++) {
          if (nextWorkers[i].status === 'idle' && nextQueue.length > 0) {
            const job = nextQueue.shift()!;
            nextWorkers[i] = { ...nextWorkers[i], status: 'processing', currentJobId: job.id };
            
            // Update message state globally
            setMessages(prevMsgs => 
              prevMsgs.map(m => m.id === job.id 
                ? { ...m, status: 'processing', workerId: nextWorkers[i].id, startTime: Date.now() } 
                : m
              )
            );
            
            setRequestQueue(nextQueue);
            changed = true;
          }
        }
        
        return changed ? nextWorkers : currentWorkers;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [requestQueue]);

  // Simulation Logic: Job completion
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    
    workers.forEach(worker => {
      if (worker.status === 'processing' && worker.currentJobId) {
        // Significantly more randomized duration for visual variety
        const duration = 1000 + Math.random() * 6000;
        const jobID = worker.currentJobId;
        
        const t = setTimeout(() => {
          // Release worker
          setWorkers(prev => prev.map(w => w.id === worker.id ? { ...w, status: 'idle', currentJobId: undefined } : w));
          
          // Move job to result queue
          setMessages(prev => {
            const updated = prev.map(m => m.id === jobID ? { ...m, status: 'result-queued' as const } : m);
            const job = updated.find(m => m.id === jobID);
            if (job) setResultQueue(pq => [...pq, job]);
            return updated;
          });
        }, duration);
        
        timers.push(t);
      }
    });

    return () => timers.forEach(t => clearTimeout(t));
  }, [workers]);

  // Simulation Logic: Producer matching results (Consumption)
  useEffect(() => {
    if (resultQueue.length === 0) return;

    // Faster consumption to ensure it doesn't look stuck
    const timer = setTimeout(() => {
      setResultQueue(prev => {
        if (prev.length === 0) return prev;
        const [received, ...rest] = prev;
        setMessages(msgs => msgs.map(m => m.id === received.id ? { ...m, status: 'completed' as const, endTime: Date.now() } : m));
        return rest;
      });
    }, 500 + Math.random() * 500); 

    return () => clearTimeout(timer);
  }, [resultQueue]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-8 selection:bg-blue-500/10">
      {/* Header */}
      <header className="max-w-7xl mx-auto mb-10 flex items-end justify-between border-b border-slate-200 pb-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Distributed Task Architecture</h1>
          <p className="text-sm text-slate-500 font-medium">Real-time Reactive MQ Flow with Dynamic Worker Scaling</p>
        </div>
        
        <div className="flex gap-6 items-center">
          <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Active
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Processing
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> Idle
            </div>
          </div>
          <div className="h-8 w-px bg-slate-200 mx-2" />
          <div className="flex gap-6">
            <div className="text-right">
              <div className="text-xl font-bold text-slate-900 leading-none">{processedCount}</div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">Succeeded</div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-slate-900 leading-none">{pendingCount}</div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">Pending</div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-0 items-start">
        
        {/* Column 1: Producer A */}
        <section className="lg:col-span-3 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm border-l-4 border-blue-600 h-full">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold uppercase tracking-widest text-blue-600">Control Station A</h2>
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Message Dispatcher</h3>
            <p className="text-xs text-slate-500 mb-4">Generates task bundles</p>
            
            <div className="flex gap-2 mb-4">
              <button 
                onClick={addRequest}
                className="flex-1 relative flex items-center justify-center gap-2 py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition-all active:scale-[0.98] shadow-sm z-10"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="text-[11px]">Dispatch</span>
              </button>
              <button 
                onClick={addMultipleRequests}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all active:scale-[0.98] shadow-sm flex items-center gap-1.5"
                title="Batch Dispatch x10"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="text-[11px]">x10</span>
              </button>
            </div>

            <div className="mt-8 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Status Resolver</h4>
                <div className="text-[10px] font-mono font-bold text-blue-600">
                  {messages.length > 0 ? Math.round((processedCount / messages.length) * 100) : 0}% Done
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-4 border border-slate-200/50">
                <motion.div 
                  className="bg-emerald-500 h-full origin-left"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: messages.length > 0 ? (processedCount / messages.length) : 0 }}
                  transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
                />
              </div>

              <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar space-y-2 border-t border-slate-100 pt-3">
                <AnimatePresence initial={false}>
                  {messages.slice().reverse().map((msg) => (
                    <motion.div 
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "p-3 rounded-lg border text-xs transition-colors relative overflow-hidden",
                        msg.status === 'completed' ? "bg-emerald-50/50 border-emerald-100 shadow-sm" : "bg-white border-slate-200"
                      )}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-slate-900 font-bold font-mono">{msg.id}</span>
                        {msg.status === 'completed' ? (
                          <div className="flex items-center gap-1 text-emerald-600">
                             <CheckCircle2 className="w-3 h-3" />
                             <span className="text-[10px] font-bold">COMPLETED</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <RefreshCw className="w-2.5 h-2.5 text-blue-500 animate-spin" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Syncing</span>
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 flex justify-between font-mono">
                        <span className="capitalize">{msg.status.replace('-', ' ')}</span>
                        {msg.endTime && msg.startTime && (
                          <span className="text-slate-500">+{((msg.endTime - msg.startTime) / 1000).toFixed(1)}s</span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {messages.length === 0 && (
                  <div className="text-center py-6 text-slate-300 text-xs italic">
                    No active tasks
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Gap 1: Dispatch Track */}
        <div className="lg:col-span-1 flex flex-col pt-[110px] gap-[104px] px-1 pointer-events-none self-stretch">
          <div className="flex flex-col items-center gap-1.5 overflow-hidden">
            <div className="w-full h-3 bg-slate-100 rounded-full border border-slate-200 relative overflow-hidden shadow-inner">
               <motion.div 
                 className="absolute top-0 left-0 h-full flex gap-1 items-center px-1"
                 animate={{ x: [0, 12] }}
                 transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
               >
                 {[...Array(8)].map((_, i) => (
                   <div key={i} className="w-1 h-3 bg-blue-500/30 rounded-full" />
                 ))}
               </motion.div>
               <motion.div 
                className="absolute top-1/2 left-0 w-3 h-3 bg-blue-500 rounded-full -translate-y-1/2 shadow-[0_0_12px_rgba(59,130,246,0.8)] z-10"
                animate={{ left: ['-10%', '110%'] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
              />
            </div>
            <span className="text-[7px] font-extrabold text-blue-500 uppercase tracking-tighter opacity-70">TX_BUS</span>
          </div>
          
          <div className="flex flex-col items-center gap-1.5 overflow-hidden">
             <div className="w-full h-3 bg-slate-100 rounded-full border border-slate-200 relative overflow-hidden shadow-inner">
               <motion.div 
                 className="absolute top-0 right-0 h-full flex gap-1 items-center px-1"
                 animate={{ x: [0, -12] }}
                 transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
               >
                 {[...Array(8)].map((_, i) => (
                   <div key={i} className="w-1 h-3 bg-emerald-500/30 rounded-full" />
                 ))}
               </motion.div>
               <motion.div 
                className="absolute top-1/2 right-0 w-3 h-3 bg-emerald-500 rounded-full -translate-y-1/2 shadow-[0_0_12px_rgba(16,185,129,0.8)] z-10"
                animate={{ right: ['-10%', '110%'] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
              />
            </div>
            <span className="text-[7px] font-extrabold text-emerald-500 uppercase tracking-tighter opacity-70">RX_BUS</span>
          </div>
        </div>

        {/* Column 2: RabbitMQ Cluster */}
        <section className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-6 relative">
          <div className="absolute -top-3 left-6 px-3 py-1 bg-slate-900 text-white rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg">
            <Layers className="w-3 h-3 text-blue-400" /> RabbitMQ Cluster Service
          </div>

          <div className="flex flex-col gap-8 mt-4">
            {/* INBOUND QUEUE */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 relative flex flex-col gap-4 shadow-inner group">
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <Database className="w-3 h-3 text-blue-500" /> RabbitMQ_INTERNAL (Tasks)
                </h2>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span className="text-[9px] font-bold text-blue-600 uppercase">Broker_Active</span>
                </div>
              </div>
              
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-2 transition-transform group-hover:scale-[1.01]">
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="text-slate-400">Queue Depth</span>
                  <span className="font-mono text-blue-600">{requestQueue.length} msg</span>
                </div>
                
                <div className="flex gap-1.5 overflow-hidden h-8 items-center justify-start px-1 bg-slate-50/50 rounded-md py-1">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {requestQueue.map((msg) => (
                      <motion.div
                        key={msg.id}
                        layout
                        initial={{ opacity: 0, scale: 0.5, x: 200, filter: 'blur(4px)' }}
                        animate={{ opacity: 1, scale: 1, x: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, scale: 1.5, x: 300, filter: 'blur(8px)', transition: { duration: 0.5 } }}
                        className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-sm shadow-sm border border-blue-600/20"
                      >
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-2.5 h-[1px] bg-white/40" />
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {requestQueue.length === 0 && (
                    <motion.div 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      className="flex-1 flex items-center justify-center text-[9px] text-slate-300 font-bold uppercase tracking-widest"
                    >
                      Idle State
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

            {/* OUTBOUND QUEUE */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 relative flex flex-col gap-4 shadow-inner group">
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <Activity className="w-3 h-3 text-emerald-500" /> RabbitMQ_INTERNAL (Results)
                </h2>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[9px] font-bold text-emerald-600 uppercase">Sink_Online</span>
                </div>
              </div>
              
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-2 transition-transform group-hover:scale-[1.01]">
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="text-slate-400">Signal Cache</span>
                  <span className="font-mono text-emerald-600">{resultQueue.length} res</span>
                </div>
                
                <div className="flex gap-1.5 overflow-hidden h-8 items-center justify-end px-1 bg-slate-50/50 rounded-md py-1">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {resultQueue.map((msg) => (
                      <motion.div
                        key={msg.id}
                        layout
                        initial={{ opacity: 0, scale: 0.5, x: 300, filter: 'blur(4px)' }}
                        animate={{ opacity: 1, scale: 1, x: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, scale: 1.5, x: -500, filter: 'blur(8px)', transition: { duration: 0.5 } }}
                        className="flex-shrink-0 w-8 h-6 bg-emerald-500 rounded-sm shadow-sm border border-emerald-600/20 flex items-center justify-center"
                      >
                        <CheckCircle2 className="w-3 h-3 text-white/50" />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {resultQueue.length === 0 && (
                    <div className="flex-1 flex items-center justify-center text-[9px] text-slate-300 font-bold uppercase tracking-widest">
                      Buffered Empty
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Gap 2: Worker Channel */}
        <div className="lg:col-span-1 flex flex-col pt-[110px] gap-[104px] px-1 pointer-events-none self-stretch">
          <div className="flex flex-col items-center gap-1.5 overflow-hidden">
             <div className="w-full h-3 bg-slate-100 rounded-full border border-slate-200 relative overflow-hidden shadow-inner">
               <motion.div 
                 className="absolute top-0 left-0 h-full flex gap-1 items-center px-1"
                 animate={{ x: [0, 12] }}
                 transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
               >
                 {[...Array(6)].map((_, i) => (
                   <div key={i} className="w-1.5 h-3 bg-indigo-500/20 rounded-full" />
                 ))}
               </motion.div>
               <motion.div 
                className="absolute top-1/2 left-0 w-3 h-3 bg-indigo-500 rounded-full -translate-y-1/2"
                animate={{ left: ['-20%', '120%'] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              />
            </div>
            <span className="text-[7px] font-extrabold text-indigo-500 uppercase tracking-tighter opacity-70">PULL</span>
          </div>
          
          <div className="flex flex-col items-center gap-1.5 overflow-hidden">
             <div className="w-full h-3 bg-slate-100 rounded-full border border-slate-200 relative overflow-hidden shadow-inner flex justify-end">
               <motion.div 
                 className="absolute top-0 right-0 h-full flex gap-1 items-center px-1"
                 animate={{ x: [0, -12] }}
                 transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
               >
                 {[...Array(6)].map((_, i) => (
                   <div key={i} className="w-1.5 h-3 bg-purple-500/20 rounded-full" />
                 ))}
               </motion.div>
               <motion.div 
                className="absolute top-1/2 right-0 w-3 h-3 bg-purple-500 rounded-full -translate-y-1/2"
                animate={{ right: ['-20%', '120%'] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              />
            </div>
            <span className="text-[7px] font-extrabold text-purple-500 uppercase tracking-tighter opacity-70">PUSH</span>
          </div>
        </div>

        {/* Column 3: Worker Fleet */}
        <section className="lg:col-span-3 h-full">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm h-full flex flex-col">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">IPDK Fleet</h2>
                <p className="text-[10px] text-slate-500 font-medium tracking-tight">IPDK Online Workers</p>
              </div>
              <button 
                onClick={addWorker}
                className="px-2.5 py-1 text-[9px] border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-md transition-colors text-slate-600 font-bold uppercase tracking-tight"
              >
                Scale Out
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3 pb-4">
              {workers.map((worker) => (
                <div 
                  key={worker.id}
                  className={cn(
                    "relative overflow-hidden border rounded-lg p-2.5 transition-all duration-300",
                    worker.status === 'processing' 
                      ? "bg-white border-blue-200 shadow-sm" 
                      : "bg-slate-50 opacity-40 grayscale"
                  )}
                >
                   <div className="flex justify-between items-center mb-2">
                      <div className="text-[8px] font-extrabold text-slate-700 flex items-center gap-1">
                        <Cpu className={cn("w-2.5 h-2.5", worker.status === 'processing' ? "text-blue-500" : "text-slate-400")} />
                        W_{worker.id.split('-')[1]}
                      </div>
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        worker.status === 'processing' ? "bg-green-500 animate-pulse" : "bg-slate-300"
                      )} />
                   </div>

                   <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[7px] font-bold text-slate-400">
                        <span>{worker.ip}</span>
                        <span className={worker.status === 'processing' ? "text-blue-600" : ""}>
                          {worker.status.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                        {worker.status === 'processing' && (
                          <motion.div 
                            className="bg-blue-500 h-full w-full origin-left"
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                          />
                        )}
                      </div>
                   </div>
                </div>
              ))}
            </div>
            
            <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[8px] text-slate-300 font-bold uppercase tracking-widest">
               Cluster Capacity: {workers.length} nodes active
            </div>
          </div>
        </section>
      </main>
      
      <footer className="max-w-7xl mx-auto mt-10 pt-8 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400 font-medium font-mono uppercase tracking-[0.1em]">
        <div className="flex gap-8">
          <div className="flex flex-col gap-0.5">
            <span className="text-slate-400">System Throughput</span>
            <span className="text-xs font-bold text-slate-900 tracking-tighter">14.2k items/sec</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-slate-400">Queue Latency</span>
            <span className="text-xs font-bold text-blue-600 tracking-tighter">12ms - 48ms</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-slate-400">Worker Utilization</span>
            <span className="text-xs font-bold text-slate-900 tracking-tighter">
              {((workers.filter(w => w.status === 'processing').length / workers.length) * 100).toFixed(0)}%
            </span>
          </div>
        </div>
        <div className="text-[9px] bg-slate-900 text-slate-400 px-3 py-1 rounded-full font-mono">
          NODE_POOL: ASIA-NORTHEAST-1 • AUTO_SCALING: ENABLED
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
