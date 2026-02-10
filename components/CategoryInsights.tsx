
import React, { useState, useEffect, useMemo } from 'react';
import { 
    ResponsiveContainer, PieChart, Pie, Cell, Tooltip, 
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { fetchAllTasks } from '../services/projectService';
import { fetchTransactions } from '../services/financialService';
import { Loader2, Layers, DollarSign, TrendingUp, Package, Info, Download } from 'lucide-react';

interface Props {
    organizationId?: number;
}

const COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#EF4444', '#06B6D4', '#F97316', '#64748B', '#A855F7'];

// Tooltip Personalizado para resolver o problema dos "blocos pretos"
const CustomTooltip = ({ active, payload, label, currency = false }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl animate-in zoom-in duration-200 ring-1 ring-white/5">
                <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1">
                    {payload[0].payload.name || label}
                </p>
                <p className="text-sm font-black text-white">
                    {currency 
                        ? `R$ ${Number(payload[0].value).toLocaleString('pt-BR')}` 
                        : `${payload[0].value} Cards`}
                </p>
            </div>
        );
    }
    return null;
};

export const CategoryInsights: React.FC<Props> = ({ organizationId }) => {
    const [loading, setLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
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
                console.error("Erro ao carregar insights:", e);
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
            sums[cat] = (sums[cat] || 0) + Number(tr.amount);
        });
        return Object.entries(sums)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [transactions]);

    const handleExportXlsx = async () => {
        if (taskData.length === 0) return;
        setIsExporting(true);
        try {
            // Importação dinâmica para não pesar o bundle inicial
            const XLSX = await import('https://esm.sh/xlsx@0.18.5');
            
            const dataToExport = taskData.map((item) => {
                const fin = financialData.find(f => f.name === item.name)?.value || 0;
                return {
                    'Área Estratégica': item.name.toUpperCase(),
                    'Quantidade de Ativos': item.value,
                    'Volume Financeiro (R$)': fin
                };
            });

            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventário Shinkō');
            
            // Ajustar largura das colunas
            const wscols = [
                { wch: 30 },
                { wch: 20 },
                { wch: 25 }
            ];
            worksheet['!cols'] = wscols;

            XLSX.writeFile(workbook, `shinko_inventario_${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (error) {
            console.error("Erro ao exportar XLSX:", error);
            alert("Erro técnico ao gerar o arquivo Excel.");
        } finally {
            setIsExporting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Auditando Ativos...</span>
            </div>
        );
    }

    const maxTaskCat = taskData[0]?.name || 'N/A';
    const maxFinCat = financialData[0]?.name || 'N/A';

    return (
        <div className="space-y-10 animate-in fade-in duration-700 pb-40">
            
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
                
                {/* Volume de Cards - Container Flexível */}
                <div className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[3.5rem] border border-slate-100 dark:border-white/5 shadow-soft flex flex-col min-h-[600px] h-auto">
                    <div className="flex justify-between items-center mb-8 shrink-0">
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Volume de Cards</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Distribuição por Pilar Shinkō</p>
                        </div>
                        <Package className="text-slate-200 dark:text-slate-800 w-10 h-10"/>
                    </div>
                    
                    <div className="w-full h-[320px] shrink-0 relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={taskData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={75}
                                    outerRadius={105}
                                    paddingAngle={6}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {taskData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-[8px] font-black text-slate-400 uppercase">Total</span>
                            <span className="text-2xl font-black text-slate-900 dark:text-white">{tasks.length}</span>
                        </div>
                    </div>

                    <div className="mt-8 flex-1 space-y-4">
                        <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 dark:border-white/5 pb-2 mb-4">
                            <Info className="w-3 h-3"/> Detalhamento do Mix
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                            {taskData.map((item, idx) => (
                                <div key={item.name} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 group hover:border-amber-500/30 transition-all">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                        <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 truncate uppercase tracking-tight">{item.name}</span>
                                    </div>
                                    <span className="text-xs font-black text-slate-900 dark:text-white ml-2">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Valor Financeiro - Container Flexível com Altura Dinâmica para Barras */}
                <div className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[3.5rem] border border-slate-100 dark:border-white/5 shadow-soft flex flex-col min-h-[600px] h-auto">
                    <div className="flex justify-between items-center mb-8 shrink-0">
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Valor Financeiro</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Peso Bruto por Categoria</p>
                        </div>
                        <TrendingUp className="text-slate-200 dark:text-slate-800 w-10 h-10"/>
                    </div>

                    {/* Altura calculada dinamicamente: no mínimo 350px ou 50px por item */}
                    <div 
                        className="w-full relative z-10" 
                        style={{ height: `${Math.max(350, financialData.length * 50)}px` }}
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={financialData} layout="vertical" margin={{ left: 10, right: 40, top: 10, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#ffffff05" />
                                <XAxis type="number" hide />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    width={120}
                                    tick={{ fontSize: 8, fontWeight: '900', fill: '#94a3b8', textTransform: 'uppercase' }} 
                                    axisLine={false} 
                                    tickLine={false} 
                                />
                                <Tooltip content={<CustomTooltip currency={true} />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                                <Bar dataKey="value" name="Valor" radius={[0, 12, 12, 0]} barSize={28}>
                                    {financialData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} opacity={0.85} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="mt-auto pt-8 border-t border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/[0.01] -mx-8 -mb-8 p-8 rounded-b-[3.5rem]">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Custo Operacional Total</span>
                            <span className="text-2xl font-black text-slate-900 dark:text-white">
                                R$ {financialData.reduce((acc, curr) => acc + curr.value, 0).toLocaleString('pt-BR')}
                            </span>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <DollarSign className="w-6 h-6 text-emerald-500"/>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabela de Inventário Industrial */}
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-white/5 overflow-hidden shadow-soft">
                <div className="p-8 border-b border-slate-50 dark:border-white/5 flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Inventário Consolidado</h4>
                    <button 
                        onClick={handleExportXlsx}
                        disabled={isExporting}
                        className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-amber-500 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                        {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        Exportar XLSX
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-white/[0.02]">
                            <tr>
                                <th className="px-10 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Área Estratégica</th>
                                <th className="px-10 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Unidades</th>
                                <th className="px-10 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Volume Financeiro</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                            {taskData.map((item, idx) => {
                                const fin = financialData.find(f => f.name === item.name)?.value || 0;
                                return (
                                    <tr key={item.name} className="hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-colors group">
                                        <td className="px-10 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                                <span className="text-xs font-black text-slate-800 dark:text-slate-200 group-hover:text-amber-500 transition-colors uppercase tracking-tight">{item.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-5 text-center">
                                            <span className="text-sm font-bold text-slate-500 dark:text-slate-400">{item.value} <span className="text-[9px] uppercase ml-1 opacity-50">Assets</span></span>
                                        </td>
                                        <td className="px-10 py-5 text-right">
                                            <span className="text-sm font-black text-emerald-500">R$ {fin.toLocaleString('pt-BR')}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
