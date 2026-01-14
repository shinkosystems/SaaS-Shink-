
import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { fetchAllTasks } from '../services/projectService';
import { fetchTransactions } from '../services/financialService';
import { Loader2 } from 'lucide-react';

interface Props {
    organizationId?: number;
}

const COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899'];

export const CategoryInsights: React.FC<Props> = ({ organizationId }) => {
    const [loading, setLoading] = useState(true);
    const [tasks, setTasks] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);

    useEffect(() => {
        if (!organizationId) return;
        setLoading(true);
        Promise.all([
            fetchAllTasks(organizationId),
            fetchTransactions(organizationId)
        ]).then(([t, f]) => {
            setTasks(t);
            setTransactions(f);
            setLoading(false);
        });
    }, [organizationId]);

    const taskData = useMemo(() => {
        const counts: Record<string, number> = {};
        tasks.forEach(t => {
            const cat = t.category || 'Outros';
            counts[cat] = (counts[cat] || 0) + 1;
        });
        // Retorna cópias mutáveis
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [tasks]);

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-amber-500" /></div>;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6">
            <div className="bg-white/5 p-8 rounded-[2.5rem] h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={taskData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} stroke="none">
                            {taskData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip isAnimationActive={false} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
