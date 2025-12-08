
import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, ZAxis } from 'recharts';
import { Opportunity } from '../types';

interface Props {
  data: Opportunity[];
  onClick?: (opp: Opportunity) => void;
  theme?: 'dark' | 'light';
}

const MatrixChart: React.FC<Props> = ({ data, onClick, theme = 'dark' }) => {
  
  // Map z to prioScore for bubble size
  const chartData = data.map(d => ({ 
      ...d, 
      x: d.velocity, 
      y: d.viability, 
      z: d.prioScore * 100 // Scale up for visibility
  }));

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
        <div className="p-3 rounded-xl backdrop-blur-xl border shadow-xl text-xs z-50" style={{ backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder, color: colors.tooltipText }}>
          <p className="font-bold mb-1 text-amber-500">{data.title}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
              <span style={{ color: colors.text }}>Velocidade:</span> 
              <span className="font-bold text-right">{data.velocity}</span>
              
              <span style={{ color: colors.text }}>Viabilidade:</span>
              <span className="font-bold text-right">{data.viability}</span>
              
              <span style={{ color: colors.text }}>PRIO-6 Score:</span>
              <span className="font-bold text-right text-purple-500">{data.prioScore.toFixed(1)}</span>
          </div>
          <p className="text-blue-500 mt-2 font-medium border-t border-white/10 pt-1">{data.archetype}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="matrix-chart-container" className="w-full h-full relative">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 absolute top-6 left-6 z-10 drop-shadow-md pointer-events-none">Matriz RDE (Portfólio)</h3>
        
        <div className="absolute top-14 right-12 text-xs font-bold text-emerald-600 dark:text-emerald-400 text-right z-0 opacity-60 pointer-events-none">Veloz & Viável<br/>(Atacar)</div>
        <div className="absolute top-14 left-16 text-xs font-bold text-yellow-600 dark:text-yellow-400 z-0 opacity-60 pointer-events-none">Lento & Viável<br/>(Estratégico)</div>
        <div className="absolute bottom-14 right-12 text-xs font-bold text-orange-600 dark:text-orange-400 text-right z-0 opacity-60 pointer-events-none">Veloz & Difícil<br/>(Parceria/MVP)</div>
        <div className="absolute bottom-14 left-16 text-xs font-bold text-red-600 dark:text-red-400 z-0 opacity-60 pointer-events-none">Lento & Difícil<br/>(Investigar)</div>

      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 50, right: 40, bottom: 40, left: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} horizontal={false} />
          {/* Custom Grid Lines */}
          <ReferenceLine x={3} stroke={colors.referenceLine} strokeDasharray="5 5" />
          <ReferenceLine y={3} stroke={colors.referenceLine} strokeDasharray="5 5" />

          <XAxis type="number" dataKey="x" name="Velocidade" domain={[0, 6]} stroke={colors.text} tickCount={6} axisLine={false} tickLine={false} />
          <YAxis type="number" dataKey="y" name="Viabilidade" domain={[0, 6]} stroke={colors.text} tickCount={6} axisLine={false} tickLine={false} />
          <ZAxis type="number" dataKey="z" range={[100, 1000]} name="Score" />
          
          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ strokeDasharray: '3 3', stroke: colors.grid }} 
            wrapperStyle={{ zIndex: 100 }}
          />
          
          <Scatter name="Oportunidades" data={chartData} onClick={(node) => onClick && onClick(node.payload as Opportunity)}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={
                entry.x >= 3 && entry.y >= 3 ? '#10b981' : 
                entry.x < 3 && entry.y >= 3 ? '#f59e0b' : 
                entry.x >= 3 && entry.y < 3 ? '#f97316' : '#ef4444'
              } stroke="rgba(255,255,255,0.4)" strokeWidth={2} className="cursor-pointer hover:opacity-80 transition-all duration-300" />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MatrixChart;
