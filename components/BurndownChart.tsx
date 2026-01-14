
import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Opportunity } from '../types';

interface Props {
  opportunity: Opportunity;
}

const BurndownChart: React.FC<Props> = ({ opportunity }) => {
  const data = useMemo(() => {
    if (!opportunity.bpmn?.nodes) return [];
    
    // Extraímos apenas os dados necessários para uma estrutura plana e mutável
    const tasks = opportunity.bpmn.nodes.flatMap(n => n.checklist || []);
    if (tasks.length === 0) return [];

    const totalHours = tasks.reduce((acc, t) => acc + (Number(t.estimatedHours) || 0), 0);
    const completedHours = tasks.filter(t => t.status === 'done').reduce((acc, t) => acc + (Number(t.estimatedHours) || 0), 0);

    // Estrutura simplificada para o Recharts
    return [
      { name: 'Início', ideal: totalHours, real: totalHours },
      { name: 'Atual', ideal: 0, real: totalHours - completedHours }
    ];
  }, [opportunity]);

  if (data.length === 0) return null;

  return (
    <div className="h-48 w-full bg-black/20 rounded-2xl p-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="name" tick={{fontSize: 10, fill: '#64748b'}} hide />
          <YAxis tick={{fontSize: 10, fill: '#64748b'}} hide />
          <Tooltip isAnimationActive={false} />
          <Area type="monotone" dataKey="real" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} strokeWidth={3} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BurndownChart;
