
import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, ZAxis, ReferenceArea } from 'recharts';
import { Opportunity } from '../types';

interface Props {
  data: Opportunity[];
  onClick?: (opp: Opportunity) => void;
  theme?: 'dark' | 'light';
}

const MatrixChart: React.FC<Props> = ({ data, onClick, theme = 'light' }) => {
  
  const chartData = data.map(d => ({ 
      ...d, 
      x: d.velocity, 
      y: d.viability, 
      z: Number(d.mrr || 1)
  }));

  const colors = {
      grid: theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.05)',
      tooltipBg: theme === 'dark' ? '#0A0A0C' : '#FFFFFF',
      tooltipBorder: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      text: theme === 'dark' ? '#94A3B8' : '#64748B'
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="p-6 rounded-[2rem] backdrop-blur-3xl border border-shinko-slate-100 bg-white/95 shadow-xl animate-in zoom-in duration-200 min-w-[240px]">
          <div className="flex justify-between items-center mb-6">
              <p className="font-black text-shinko-amber uppercase tracking-widest text-xs">{d.title}</p>
              <div className="w-2 h-2 rounded-full bg-shinko-amber animate-pulse"></div>
          </div>
          <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                  <span className="text-[8px] font-black uppercase text-shinko-slate-400">PRIO Score</span> 
                  <p className="font-black text-lg text-shinko-slate-900">{d.prioScore.toFixed(1)}</p>
              </div>
              <div className="space-y-1">
                  <span className="text-[8px] font-black uppercase text-shinko-slate-400">MRR Alvo</span>
                  <p className="font-black text-lg text-emerald-600">R$ {Number(d.mrr).toLocaleString()}</p>
              </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full relative font-sans">
        <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 100, right: 60, bottom: 60, left: 60 }}>
          <ReferenceArea x1={3} x2={6} y1={3} y2={6} fill="#10b981" fillOpacity={0.05} stroke="none" />
          <ReferenceArea x1={0} x2={3} y1={3} y2={6} fill="#eab308" fillOpacity={0.04} stroke="none" />
          <ReferenceArea x1={3} x2={6} y1={0} y2={3} fill="#f97316" fillOpacity={0.04} stroke="none" />
          <ReferenceArea x1={0} x2={3} y1={0} y2={3} fill="#ef4444" fillOpacity={0.05} stroke="none" />

          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical horizontal />
          
          <ReferenceLine x={3} stroke="rgba(0,0,0,0.1)" strokeWidth={1} />
          <ReferenceLine y={3} stroke="rgba(0,0,0,0.1)" strokeWidth={1} />

          <XAxis type="number" dataKey="x" domain={[0, 6]} hide />
          <YAxis type="number" dataKey="y" domain={[0, 6]} hide />
          <ZAxis type="number" dataKey="z" range={[400, 2000]} />
          
          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ strokeDasharray: '3 3', stroke: 'rgba(0,0,0,0.1)' }} 
          />
          
          <Scatter name="Ativos" data={chartData} onClick={(node) => onClick && onClick(node.payload as Opportunity)}>
            {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={
                  entry.x >= 3 && entry.y >= 3 ? '#10b981' : 
                  entry.x < 3 && entry.y >= 3 ? '#f59e0b' : 
                  entry.x >= 3 && entry.y < 3 ? '#f97316' : '#ef4444'
                } stroke="#FFF" strokeWidth={2} className="cursor-pointer hover:scale-125 transition-transform duration-300 shadow-lg" />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MatrixChart;
