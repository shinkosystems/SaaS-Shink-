
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Opportunity } from '../types';
import { TrendingDown, AlertTriangle, Calendar, CheckCircle2 } from 'lucide-react';

interface Props {
  opportunity: Opportunity;
}

const BurndownChart: React.FC<Props> = ({ opportunity }) => {
  if (!opportunity.bpmn) return null;

  let allTasks: any[] = [];
  opportunity.bpmn.nodes.forEach(node => {
      node.checklist.forEach(task => {
          if (task.estimatedHours) {
              allTasks.push({
                  id: task.id,
                  hours: Number(task.estimatedHours),
                  completed: task.completed || task.status === 'done',
                  completedAt: task.completedAt ? new Date(task.completedAt) : null,
                  dueDate: task.dueDate ? new Date(task.dueDate) : null,
              });
          }
      });
  });

  if (allTasks.length === 0) return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/30">
          <p className="text-sm font-bold">Sem dados suficientes</p>
          <p className="text-xs">Defina horas estimadas nas tarefas.</p>
      </div>
  );

  const totalHours = allTasks.reduce((acc, t) => acc + t.hours, 0);
  const startDate = new Date(opportunity.createdAt);
  
  // Define Timeline End Date (Max of Due Dates or Completed Dates)
  let plannedEndDate = new Date(startDate);
  allTasks.forEach(t => {
      if (t.dueDate && t.dueDate > plannedEndDate) plannedEndDate = new Date(t.dueDate);
  });
  
  // Ensure minimum graph width (7 days)
  const minEndDate = new Date(startDate);
  minEndDate.setDate(minEndDate.getDate() + 7);
  if (plannedEndDate < minEndDate) plannedEndDate = minEndDate;

  // --- Data Generation ---
  const data = [];
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today for comparison

  const totalDurationDays = Math.max(1, (plannedEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const idealBurnRate = totalHours / totalDurationDays;

  let currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0); // Normalize to start of day

  // Calculate Velocity (Hours burned per day)
  let burnedHoursTotal = 0;
  const daysElapsed = Math.max(1, (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Loop through days until Planned End Date OR Today (whichever is further, to show delays)
  const renderEndDate = plannedEndDate > today ? plannedEndDate : today;
  
  // Safety break
  let safetyLoop = 0;

  while (currentDate <= renderEndDate && safetyLoop < 365) {
      safetyLoop++;
      const dateStr = currentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const timestamp = currentDate.getTime();

      // 1. Calculate Ideal Line
      // Days passed relative to start
      const dayIndex = (timestamp - startDate.getTime()) / (1000 * 60 * 60 * 24);
      let ideal = totalHours - (idealBurnRate * dayIndex);
      if (ideal < 0) ideal = 0;

      // 2. Calculate Real Line (Remaining Hours)
      // Sum tasks that were NOT completed before the END of this currentDate
      const currentEndOfDay = new Date(currentDate);
      currentEndOfDay.setHours(23, 59, 59, 999);

      const remainingHours = allTasks.reduce((acc, t) => {
          // If task is completed AND completion date was ON or BEFORE this day, it's burned.
          // Otherwise, it's remaining.
          if (t.completed && t.completedAt && t.completedAt <= currentEndOfDay) {
              return acc; 
          }
          return acc + t.hours;
      }, 0);

      // Only plot Real data up to Today
      const isFuture = currentDate > today;

      data.push({
          date: dateStr,
          Ideal: Number(ideal.toFixed(1)),
          Real: isFuture ? null : Number(remainingHours.toFixed(1)),
          remaining: remainingHours
      });

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
  }

  // --- Prediction Logic ---
  const currentRemaining = data.find(d => d.Real !== null && d.Real !== undefined, -1)?.remaining ?? totalHours; // Last known remaining
  const hoursBurned = totalHours - currentRemaining;
  
  // Calculate Velocity (Hours / Day)
  // Avoid division by zero if project just started today
  const velocity = hoursBurned / daysElapsed; 

  let projectedDate: Date | null = null;
  let projectionMessage = "";
  let projectionStatus: 'ontrack' | 'delayed' | 'early' = 'ontrack';

  if (velocity > 0 && currentRemaining > 0) {
      const daysNeeded = currentRemaining / velocity;
      projectedDate = new Date();
      projectedDate.setDate(projectedDate.getDate() + Math.ceil(daysNeeded));
      
      const diffTime = projectedDate.getTime() - plannedEndDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

      if (diffDays > 2) {
          projectionStatus = 'delayed';
          projectionMessage = `Atraso previsto de ${diffDays} dias (${projectedDate.toLocaleDateString('pt-BR')})`;
      } else if (diffDays < -2) {
          projectionStatus = 'early';
          projectionMessage = `Adiantado em ${Math.abs(diffDays)} dias (${projectedDate.toLocaleDateString('pt-BR')})`;
      } else {
          projectionMessage = "No prazo previsto.";
      }
  } else if (currentRemaining === 0) {
       projectionMessage = "Projeto Concluído!";
       projectionStatus = 'early';
  } else {
       projectionMessage = "Aguardando dados de progresso...";
  }

  return (
    <div className="w-full h-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <div className="flex justify-between items-start mb-4">
             <div>
                 <h4 className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4"/> Burndown Chart
                 </h4>
                 <div className={`text-sm font-bold mt-1 flex items-center gap-2 ${
                     projectionStatus === 'delayed' ? 'text-red-500' : 
                     projectionStatus === 'early' ? 'text-emerald-500' : 'text-slate-700 dark:text-slate-300'
                 }`}>
                     {projectionStatus === 'delayed' ? <AlertTriangle className="w-4 h-4"/> : 
                      projectionStatus === 'early' ? <CheckCircle2 className="w-4 h-4"/> : <Calendar className="w-4 h-4"/>}
                     {projectionMessage}
                 </div>
             </div>
             <div className="flex gap-4 text-[10px] font-bold">
                 <div className="flex items-center gap-1 text-slate-400">
                     <div className="w-2 h-2 rounded-full bg-slate-300"></div> Ideal
                 </div>
                 <div className="flex items-center gap-1 text-amber-500">
                     <div className="w-2 h-2 rounded-full bg-amber-500"></div> Real
                 </div>
             </div>
        </div>
        
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis 
                        dataKey="date" 
                        tick={{fontSize: 10, fill: 'var(--text-muted)'}} 
                        axisLine={false} 
                        tickLine={false}
                        interval="preserveStartEnd"
                        minTickGap={30}
                    />
                    <YAxis 
                        tick={{fontSize: 10, fill: 'var(--text-muted)'}} 
                        axisLine={false} 
                        tickLine={false}
                    />
                    <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '8px', fontSize: '12px' }}
                        itemStyle={{ color: 'var(--text-main)' }}
                        labelStyle={{ color: 'var(--text-muted)', marginBottom: '4px' }}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="Ideal" 
                        stroke="#94a3b8" 
                        strokeDasharray="5 5" 
                        fill="none" 
                        strokeWidth={2}
                        name="Planejado (h)"
                    />
                    <Area 
                        type="stepAfter" 
                        dataKey="Real" 
                        stroke="#f59e0b" 
                        fillOpacity={1} 
                        fill="url(#colorReal)" 
                        strokeWidth={3}
                        name="Restante (h)"
                        connectNulls={true}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    </div>
  );
};

export default BurndownChart;
