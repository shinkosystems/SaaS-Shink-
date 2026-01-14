
import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceArea, Label, ZAxis } from 'recharts';
import { Opportunity } from '../types';

interface Props {
  data: Opportunity[];
  onClick?: (opp: Opportunity) => void;
  theme?: 'dark' | 'light';
}

const MatrixChart: React.FC<Props> = ({ data, onClick, theme = 'dark' }) => {
  
  // SANITIZAÇÃO CRÍTICA:
  // Nunca passe o objeto da oportunidade inteiro para o Recharts.
  // Criamos um objeto "flat" contendo apenas primitivos.
  const chartData = data.map(d => ({ 
      id: d.id,
      title: d.title,
      mrr: Number(d.mrr || 0),
      x: Number(d.velocity || 0), 
      y: Number(d.viability || 0), 
      z: Number(d.mrr || 1000),
      prio: Number(d.prioScore || 0)
  }));

  const isDark = theme === 'dark';

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 shadow-2xl text-[10px] z-[500] min-w-[180px]">
          <p className="font-black text-amber-500 uppercase mb-2 truncate max-w-[160px]">{d.title}</p>
          <div className="space-y-1 text-slate-300">
            <div className="flex justify-between"><span>PRIO SCORE:</span> <span className="font-black text-white">{d.prio.toFixed(1)}</span></div>
            <div className="flex justify-between"><span>MRR ALVO:</span> <span className="font-black text-emerald-500">R$ {d.mrr.toLocaleString()}</span></div>
          </div>
        </div>
      );
    }
    return null;
  };

  const handlePointClick = (pointData: any) => {
      if (!onClick) return;
      // Recuperamos o objeto completo do array original estável 'data'
      // garantindo que o componente pai receba o objeto BPMN original e limpo.
      const original = data.find(item => item.id === pointData.id);
      if (original) onClick(original);
  };

  return (
    <div className="w-full h-full relative font-sans isolate min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 40, right: 40, bottom: 40, left: 40 }}>
          <ReferenceArea x1={3} x2={6} y1={3} y2={6} fill="#10b981" fillOpacity={0.05} />
          <ReferenceArea x1={0} x2={3} y1={3} y2={6} fill="#eab308" fillOpacity={0.05} />
          <ReferenceArea x1={3} x2={6} y1={0} y2={3} fill="#f97316" fillOpacity={0.05} />
          <ReferenceArea x1={0} x2={3} y1={0} y2={3} fill="#ef4444" fillOpacity={0.05} />

          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
          
          <XAxis type="number" dataKey="x" domain={[0, 6]} hide />
          <YAxis type="number" dataKey="y" domain={[0, 6]} hide />
          <ZAxis type="number" dataKey="z" range={[400, 2000]} />
          
          <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
          
          <Scatter data={chartData} onClick={(node) => handlePointClick(node.payload)}>
            {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={
                  entry.x >= 3 && entry.y >= 3 ? '#10b981' : 
                  entry.x < 3 && entry.y >= 3 ? '#f59e0b' : 
                  entry.x >= 3 && entry.y < 3 ? '#f97316' : '#ef4444'
                } strokeWidth={entry.x >= 3 && entry.y >= 3 ? 10 : 2} className="cursor-pointer transition-all duration-300 hover:opacity-80" />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MatrixChart;
