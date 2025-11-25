
import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, Label } from 'recharts';
import { Opportunity } from '../types';

interface Props {
  data: Opportunity[];
  onClick?: (opp: Opportunity) => void;
  theme?: 'dark' | 'light';
}

const MatrixChart: React.FC<Props> = ({ data, onClick, theme = 'dark' }) => {
  
  const chartData = data.map(d => ({ ...d, x: d.velocity, y: d.viability, z: 1 }));

  const isDark = theme === 'dark';

  // Vitrification: Dynamic Colors based on Theme
  const colors = {
      grid: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      text: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
      tooltipBg: isDark ? 'rgba(10,10,10,0.8)' : 'rgba(255,255,255,0.9)',
      tooltipBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      tooltipText: isDark ? '#ffffff' : '#1e293b',
      referenceLine: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="p-3 rounded-xl backdrop-blur-xl border shadow-xl text-xs" style={{ backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder, color: colors.tooltipText }}>
          <p className="font-bold mb-1 text-amber-500">{data.title}</p>
          <p style={{ color: colors.text }}>Velocidade: {data.velocity}</p>
          <p style={{ color: colors.text }}>Viabilidade: {data.viability}</p>
          <p className="text-blue-500 mt-1 font-medium">{data.archetype}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="matrix-chart-container" className="w-full h-full relative">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 absolute top-6 left-6 z-10 drop-shadow-md">Matriz MVV</h3>
        
        <div className="absolute top-14 right-12 text-xs font-bold text-emerald-600 dark:text-emerald-400 text-right z-0 opacity-60">Veloz & Viável<br/>(Atacar)</div>
        <div className="absolute top-14 left-16 text-xs font-bold text-yellow-600 dark:text-yellow-400 z-0 opacity-60">Lento & Viável<br/>(Estratégico)</div>
        <div className="absolute bottom-14 right-12 text-xs font-bold text-orange-600 dark:text-orange-400 text-right z-0 opacity-60">Veloz & Difícil<br/>(Parceria/MVP)</div>
        <div className="absolute bottom-14 left-16 text-xs font-bold text-red-600 dark:text-red-400 z-0 opacity-60">Lento & Difícil<br/>(Estudar)</div>

      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 50, right: 40, bottom: 40, left: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} horizontal={false} />
          {/* Custom Grid Lines */}
          <ReferenceLine x={3} stroke={colors.referenceLine} strokeDasharray="5 5" />
          <ReferenceLine y={3} stroke={colors.referenceLine} strokeDasharray="5 5" />

          <XAxis type="number" dataKey="x" name="Velocidade" domain={[0, 6]} stroke={colors.text} tickCount={6} axisLine={false} tickLine={false} />
          <YAxis type="number" dataKey="y" name="Viabilidade" domain={[0, 6]} stroke={colors.text} tickCount={6} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: colors.grid }} />
          
          <Scatter name="Oportunidades" data={chartData} fill="#3b82f6" onClick={(node) => onClick && onClick(node.payload as Opportunity)}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={
                entry.x >= 3 && entry.y >= 3 ? '#10b981' : 
                entry.x < 3 && entry.y >= 3 ? '#f59e0b' : 
                entry.x >= 3 && entry.y < 3 ? '#f97316' : '#ef4444'
              } stroke="rgba(255,255,255,0.2)" strokeWidth={1} className="hover:opacity-80 cursor-pointer transition-all duration-300 hover:scale-110" />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MatrixChart;
