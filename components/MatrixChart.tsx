
import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, ZAxis, ReferenceArea, Label } from 'recharts';
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
    <div id="matrix-chart-container" className="w-full h-full relative font-sans">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 absolute top-6 left-6 z-10 drop-shadow-md pointer-events-none">Matriz RDE (Priorização)</h3>
        
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          {/* Quadrant Backgrounds */}
          {/* Top Right: High Velocity, High Viability (SPRINT) */}
          <ReferenceArea x1={3} x2={6} y1={3} y2={6} fill="#10b981" fillOpacity={isDark ? 0.05 : 0.1} stroke="none" />
          
          {/* Top Left: Low Velocity, High Viability (STRATEGY) */}
          <ReferenceArea x1={0} x2={3} y1={3} y2={6} fill="#eab308" fillOpacity={isDark ? 0.05 : 0.1} stroke="none" />
          
          {/* Bottom Right: High Velocity, Low Viability (MVP) */}
          <ReferenceArea x1={3} x2={6} y1={0} y2={3} fill="#f97316" fillOpacity={isDark ? 0.05 : 0.1} stroke="none" />
          
          {/* Bottom Left: Low Velocity, Low Viability (DISCARD) */}
          <ReferenceArea x1={0} x2={3} y1={0} y2={3} fill="#ef4444" fillOpacity={isDark ? 0.05 : 0.1} stroke="none" />

          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} horizontal={false} />
          
          {/* Center Lines */}
          <ReferenceLine x={3} stroke={colors.referenceLine} strokeWidth={2} />
          <ReferenceLine y={3} stroke={colors.referenceLine} strokeWidth={2} />

          {/* Quadrant Labels */}
          <ReferenceArea x1={4.5} x2={4.5} y1={5.5} y2={5.5} strokeOpacity={0}>
             <Label value="SPRINT / ATACAR" position="center" fill="#10b981" fontWeight="900" fontSize={10} opacity={0.6} />
          </ReferenceArea>
          <ReferenceArea x1={1.5} x2={1.5} y1={5.5} y2={5.5} strokeOpacity={0}>
             <Label value="ESTRATÉGICO / PLAN" position="center" fill="#eab308" fontWeight="900" fontSize={10} opacity={0.6} />
          </ReferenceArea>
          <ReferenceArea x1={4.5} x2={4.5} y1={0.5} y2={0.5} strokeOpacity={0}>
             <Label value="MVP / PARCERIA" position="center" fill="#f97316" fontWeight="900" fontSize={10} opacity={0.6} />
          </ReferenceArea>
          <ReferenceArea x1={1.5} x2={1.5} y1={0.5} y2={0.5} strokeOpacity={0}>
             <Label value="DESCARTAR / HOLD" position="center" fill="#ef4444" fontWeight="900" fontSize={10} opacity={0.6} />
          </ReferenceArea>

          <XAxis type="number" dataKey="x" name="Velocidade" domain={[0, 6]} stroke={colors.text} tickCount={7} tick={{fontSize: 10}} label={{ value: 'Velocidade (Esforço Inverso)', position: 'bottom', fill: colors.text, fontSize: 10 }} />
          <YAxis type="number" dataKey="y" name="Viabilidade" domain={[0, 6]} stroke={colors.text} tickCount={7} tick={{fontSize: 10}} label={{ value: 'Viabilidade Técnica', angle: -90, position: 'left', fill: colors.text, fontSize: 10 }} />
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
              } stroke="rgba(255,255,255,0.6)" strokeWidth={2} className="cursor-pointer hover:opacity-100 transition-all duration-300 filter drop-shadow-lg" />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MatrixChart;
