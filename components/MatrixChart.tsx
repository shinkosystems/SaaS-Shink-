
import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, ZAxis, ReferenceArea, Label } from 'recharts';
import { Opportunity } from '../types';

interface Props {
  data: Opportunity[];
  onClick?: (opp: Opportunity) => void;
  theme?: 'dark' | 'light';
}

const MatrixChart: React.FC<Props> = ({ data, onClick, theme = 'dark' }) => {
  
  const chartData = data.map(d => ({ 
      ...d, 
      x: d.velocity, 
      y: d.viability, 
      z: Number(d.mrr || 1)
  }));

  const isDark = theme === 'dark';

  const colors = {
      grid: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.05)',
      text: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)',
      tooltipBg: isDark ? 'rgba(10,10,12,0.98)' : 'rgba(255,255,255,0.98)',
      tooltipBorder: isDark ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.2)',
      tooltipText: isDark ? '#ffffff' : '#1e293b',
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      const mrr = Number(d.mrr || 0);
      
      return (
        <div className="p-6 rounded-[1.5rem] backdrop-blur-3xl border shadow-2xl text-xs z-[500] animate-in fade-in zoom-in-95 duration-200" style={{ backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder, color: colors.tooltipText }}>
          <div className="flex justify-between items-center mb-4">
              <p className="font-black text-amber-500 uppercase tracking-widest">{d.title}</p>
              <span className="text-[10px] font-black px-2 py-1 bg-white/5 rounded-lg border border-white/10 uppercase">{d.status}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 mt-2 border-t border-white/5 pt-4">
              <div className="flex flex-col">
                  <span className="text-[8px] font-black uppercase text-slate-500">Velocidade</span> 
                  <span className="font-black text-sm">{d.velocity}/5</span>
              </div>
              <div className="flex flex-col">
                  <span className="text-[8px] font-black uppercase text-slate-500">Viabilidade</span>
                  <span className="font-black text-sm">{d.viability}/5</span>
              </div>
              <div className="flex flex-col">
                  <span className="text-[8px] font-black uppercase text-slate-500">PRIO-6 Score</span>
                  <span className="font-black text-sm text-purple- purple-500">{d.prioScore.toFixed(1)}</span>
              </div>
              <div className="flex flex-col">
                  <span className="text-[8px] font-black uppercase text-slate-500">MRR Alvo</span>
                  <span className="font-black text-sm text-emerald-500">R$ {mrr.toLocaleString('pt-BR')}</span>
              </div>
          </div>
          <div className="mt-4 bg-blue-500/10 text-blue-500 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase text-center border border-blue-500/10">{d.archetype}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full relative font-sans isolate">
        <h3 className="text-lg font-black text-slate-800 dark:text-white mb-4 absolute top-2 left-2 z-10 pointer-events-none uppercase tracking-tighter opacity-50">Matriz RDE Estratégica</h3>
        
        <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 60, right: 60, bottom: 60, left: 60 }}>
          <ReferenceArea x1={3} x2={6} y1={3} y2={6} fill="#10b981" fillOpacity={isDark ? 0.02 : 0.05} stroke="none" />
          <ReferenceArea x1={0} x2={3} y1={3} y2={6} fill="#eab308" fillOpacity={isDark ? 0.02 : 0.05} stroke="none" />
          <ReferenceArea x1={3} x2={6} y1={0} y2={3} fill="#f97316" fillOpacity={isDark ? 0.02 : 0.05} stroke="none" />
          <ReferenceArea x1={0} x2={3} y1={0} y2={3} fill="#ef4444" fillOpacity={isDark ? 0.02 : 0.05} stroke="none" />

          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={true} horizontal={true} />
          
          <ReferenceLine x={3} stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"} strokeWidth={2} />
          <ReferenceLine y={3} stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"} strokeWidth={2} />

          <ReferenceArea x1={4.5} x2={4.5} y1={5.5} y2={5.5} strokeOpacity={0}>
             <Label value="EXECUTAR / ATACAR" position="center" fill="#10b981" fontWeight="900" fontSize={10} opacity={0.4} />
          </ReferenceArea>
          <ReferenceArea x1={1.5} x2={1.5} y1={5.5} y2={5.5} strokeOpacity={0}>
             <Label value="PLANEJAR / CORE" position="center" fill="#eab308" fontWeight="900" fontSize={10} opacity={0.4} />
          </ReferenceArea>
          <ReferenceArea x1={4.5} x2={4.5} y1={0.5} y2={0.5} strokeOpacity={0}>
             <Label value="PARCERIA / MVP" position="center" fill="#f97316" fontWeight="900" fontSize={10} opacity={0.4} />
          </ReferenceArea>
          <ReferenceArea x1={1.5} x2={1.5} y1={0.5} y2={0.5} strokeOpacity={0}>
             <Label value="DESCARTAR / HOLD" position="center" fill="#ef4444" fontWeight="900" fontSize={10} opacity={0.4} />
          </ReferenceArea>

          <XAxis type="number" dataKey="x" name="Velocidade" domain={[0, 6]} stroke={colors.text} tickCount={7} hide />
          <YAxis type="number" dataKey="y" name="Viabilidade" domain={[0, 6]} stroke={colors.text} tickCount={7} hide />
          <ZAxis type="number" dataKey="z" range={[400, 3000]} name="MRR" />
          
          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ strokeDasharray: '3 3', stroke: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} 
            wrapperStyle={{ zIndex: 1000 }}
            isAnimationActive={false}
          />
          
          <Scatter name="Ativos" data={chartData} onClick={(node) => onClick && onClick(node.payload as Opportunity)}>
            {chartData.map((entry, index) => {
              const isPrio = entry.x >= 3 && entry.y >= 3;
              return (
                <Cell key={`cell-${index}`} fill={
                  entry.x >= 3 && entry.y >= 3 ? '#10b981' : 
                  entry.x < 3 && entry.y >= 3 ? '#f59e0b' : 
                  entry.x >= 3 && entry.y < 3 ? '#f97316' : '#ef4444'
                } stroke={isPrio ? "rgba(16,185,129,0.5)" : "rgba(255,255,255,0.1)"} strokeWidth={isPrio ? 12 : 2} className="cursor-pointer hover:opacity-100 transition-all duration-300 filter drop-shadow-xl" />
              );
            })}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MatrixChart;
