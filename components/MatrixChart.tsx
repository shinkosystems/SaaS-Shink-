
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
      z: d.prioScore * 100 
  }));

  const isDark = theme === 'dark';

  const colors = {
      grid: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      text: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
      tooltipBg: isDark ? 'rgba(10,10,10,0.95)' : 'rgba(255,255,255,0.98)',
      tooltipBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      tooltipText: isDark ? '#ffffff' : '#1e293b',
      referenceLine: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="p-4 rounded-2xl backdrop-blur-3xl border shadow-2xl text-xs z-[500] animate-in fade-in zoom-in-95 duration-200" style={{ backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder, color: colors.tooltipText }}>
          <p className="font-black mb-2 text-amber-500 uppercase tracking-widest">{data.title}</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-2 border-t border-white/10 pt-2">
              <span style={{ color: colors.text }}>Velocidade:</span> 
              <span className="font-black text-right">{data.velocity}</span>
              
              <span style={{ color: colors.text }}>Viabilidade:</span>
              <span className="font-black text-right">{data.viability}</span>
              
              <span style={{ color: colors.text }}>PRIO-6:</span>
              <span className="font-black text-right text-purple-500">{data.prioScore.toFixed(1)}</span>
          </div>
          <div className="mt-3 bg-blue-500/10 text-blue-500 px-2 py-1 rounded-lg text-[9px] font-black uppercase text-center border border-blue-500/20">{data.archetype}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="matrix-chart-container" className="w-full h-full relative font-sans isolate">
        <h3 className="text-lg font-black text-slate-800 dark:text-white mb-4 absolute top-6 left-6 z-10 drop-shadow-md pointer-events-none uppercase tracking-tighter">Matriz RDE</h3>
        
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <ScatterChart margin={{ top: 40, right: 40, bottom: 40, left: 40 }}>
          <ReferenceArea x1={3} x2={6} y1={3} y2={6} fill="#10b981" fillOpacity={isDark ? 0.05 : 0.1} stroke="none" />
          <ReferenceArea x1={0} x2={3} y1={3} y2={6} fill="#eab308" fillOpacity={isDark ? 0.05 : 0.1} stroke="none" />
          <ReferenceArea x1={3} x2={6} y1={0} y2={3} fill="#f97316" fillOpacity={isDark ? 0.05 : 0.1} stroke="none" />
          <ReferenceArea x1={0} x2={3} y1={0} y2={3} fill="#ef4444" fillOpacity={isDark ? 0.05 : 0.1} stroke="none" />

          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} horizontal={false} />
          
          <ReferenceLine x={3} stroke={colors.referenceLine} strokeWidth={2} />
          <ReferenceLine y={3} stroke={colors.referenceLine} strokeWidth={2} />

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

          <XAxis type="number" dataKey="x" name="Velocidade" domain={[0, 6]} stroke={colors.text} tickCount={7} tick={{fontSize: 10, fontWeight: 'bold'}} label={{ value: 'Velocidade', position: 'bottom', fill: colors.text, fontSize: 10, fontWeight: '900', offset: 0 }} />
          <YAxis type="number" dataKey="y" name="Viabilidade" domain={[0, 6]} stroke={colors.text} tickCount={7} tick={{fontSize: 10, fontWeight: 'bold'}} label={{ value: 'Viabilidade', angle: -90, position: 'left', fill: colors.text, fontSize: 10, fontWeight: '900', offset: 10 }} />
          <ZAxis type="number" dataKey="z" range={[200, 1500]} name="Score" />
          
          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ strokeDasharray: '3 3', stroke: colors.grid }} 
            wrapperStyle={{ zIndex: 1000 }} // Z-index master para a tooltip do gráfico
            isAnimationActive={false}
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
