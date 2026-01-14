
import React, { useState, useEffect, useMemo } from 'react';
import { 
    ResponsiveContainer, PieChart, Pie, Cell, Tooltip, 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend 
} from 'recharts';
import { fetchAllTasks } from '../services/projectService';
import { fetchTransactions } from '../services/financialService';
import { Loader2, Layers, DollarSign, TrendingUp, Target, Package } from 'lucide-react';

interface Props {
    organizationId?: number;
}

const COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#EF4444', '#06B6D4', '#F97316', '#64748B', '#A855F7'];

export const CategoryInsights: React.FC<Props> = ({ organizationId }) => {
    const [loading, setLoading] = useState(true);
    const [tasks, setTasks] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);

    useEffect(() => {
        const load = async () => {
            if (!organizationId) return;
            setLoading(true);
            try {
                const [tData, fData] = await Promise.all([
                    fetchAllTasks(organizationId),
                    fetchTransactions(organizationId)
                ]);
                setTasks(tData);
                setTransactions(fData);
            } catch (e) {
                console.error("Erro ao carregar insights de categoria:", e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [organizationId]);

    const taskData = useMemo(() => {
        const counts: Record<string, number> = {};
        tasks.forEach(t => {
            const cat = t.category || 'Outros';
            counts[cat] = (counts[cat] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [tasks]);

    const financialData = useMemo(() => {
        const sums: Record<string, number> = {};
        transactions.forEach(tr => {
            const cat = tr.category || 'Geral';
            // Valor absoluto para facilitar a visualização de volume (independente de ser inflow/outflow)
            sums[cat] = (sums[cat] || 0) + Number(tr.amount);
        });
        return Object.entries(sums)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [transactions]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Processando Categorias...</span>
            </div>
        );
    }

    const maxTaskCat = taskData[0]?.name || 'N/A';
    const maxFinCat = financialData[0]?.name || 'N/A';

    return (
        <div className="space-y-10 animate-in fade-in duration-700 pb-20">
            
            {/* KPI Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 flex items-center gap-6 shadow-soft">
                    <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-500"><Layers className="w-8 h-8"/></div>
                    <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Foco Operacional</div>
                        <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{maxTaskCat}</div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 flex items-center gap-6 shadow-soft">
                    <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-500"><DollarSign className="w-8 h-8"/></div>
                    <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Peso Financeiro</div>
                        <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{maxFinCat}</div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 flex items-center gap-6 shadow-soft lg:col-span-1 md:col-span-2">
                    <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-500"><Package className="w-8 h-8"/></div>
                    <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categorias Ativas</div>
                        <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{taskData.length} Áreas</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Task Distribution (Pie) */}
                <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-soft flex flex-col h-[500px]">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">Volume de Cards</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Distribuição de Esforço por Categoria</p>
                        </div>
                        <Package className="text-slate-300 dark:text-slate-700 w-8 h-8"/>
                    </div>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={taskData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={120}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {taskData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                                />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Financial Value (Bar) */}
                <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-soft flex flex-col h-[500px]">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">Valor Financeiro</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Movimentação Bruta por Categoria</p>
                        </div>
                        <TrendingUp className="text-slate-300 dark:text-slate-700 w-8 h-8"/>
                    </div>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={financialData} layout="vertical" margin={{ left: 40, right: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#ffffff10" />
                                <XAxis type="number" hide />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} 
                                    axisLine={false} 
                                    tickLine={false} 
                                />
                                <Tooltip 
                                    formatter={(value: any) => `R$ ${Number(value).toLocaleString('pt-BR')}`}
                                    contentStyle={{ backgroundColor: '#0A0A0C', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white' }}
                                />
                                <Bar dataKey="value" name="Valor" radius={[0, 10, 10, 0]}>
                                    {financialData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} opacity={0.8} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Detailed Table (Optional, provides more clarity) */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 overflow-hidden shadow-soft">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/10">
                        <tr>
                            <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
                            <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Nº de Cards</th>
                            <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Volume Financeiro</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                        {taskData.map((item, idx) => {
                            const fin = financialData.find(f => f.name === item.name)?.value || 0;
                            return (
                                <tr key={item.name} className="hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-colors">
                                    <td className="px-8 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                            <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">{item.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-4 text-center">
                                        <span className="text-sm font-black text-slate-600 dark:text-slate-400">{item.value}</span>
                                    </td>
                                    <td className="px-8 py-4 text-right">
                                        <span className="text-sm font-black text-emerald-500">R$ {fin.toLocaleString('pt-BR')}</span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
