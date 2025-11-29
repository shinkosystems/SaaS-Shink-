
import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Activity, Calendar, ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight, Minus, Filter, Users, UserMinus, DollarSign, Target, Gem, PieChart, Timer, Percent, Info } from 'lucide-react';
import { FinancialRecord, FinancialTransaction } from '../types';
import { ResponsiveContainer, AreaChart, Area, Tooltip, XAxis, ReferenceArea } from 'recharts';
import { supabase } from '../services/supabaseClient';

type TimeRange = 'week' | 'month' | 'year';

interface Props {
    manualTransactions?: FinancialTransaction[];
}

// Glossário de Métricas
const METRIC_TOOLTIPS: Record<string, string> = {
    "Faturamento Bruto": "Soma total de todas as receitas recebidas (MRR + Serviços pontuais) no período.",
    "Margem Bruta": "Percentual da receita que sobra após deduzir os custos diretos (infraestrutura, taxas, fornecedores).",
    "Despesas Totais": "Soma de todos os custos operacionais, marketing, vendas e despesas administrativas.",
    "Lucro Líquido": "O que sobra no caixa: Faturamento menos todas as despesas e custos.",
    "Churn de Clientes": "Percentual de clientes que cancelaram o contrato em relação ao total de clientes ativos.",
    "Churn Financeiro": "Percentual de receita recorrente (MRR) perdida devido a cancelamentos ou downgrades.",
    "CAC (Custo Aquisição)": "Custo médio para conquistar cada novo cliente (Investimento em Mkt + Vendas ÷ Novos Clientes).",
    "LTV (Lifetime Value)": "Valor total estimado que um cliente gera para a empresa durante todo o tempo de contrato.",
    "LTV / CAC": "Indica a saúde do crescimento. O ideal é que o cliente gere pelo menos 3x o que custou para ser adquirido.",
    "Payback (Meses)": "Tempo necessário para recuperar o custo de aquisição do cliente através da margem de lucro gerada."
};

const InfoTooltip = ({ text }: { text: string }) => (
    <div className="group relative flex items-center ml-2 cursor-help z-50">
        <Info className="w-3 h-3 text-slate-400 hover:text-blue-500 transition-colors" />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-slate-800 text-white text-[11px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl leading-tight text-center border border-white/10 z-50 invisible group-hover:visible">
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
        </div>
    </div>
);

export const FinancialDashboard: React.FC<Props> = ({ manualTransactions = [] }) => {
    const [timeRange, setTimeRange] = useState<TimeRange>('month');
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth()); // 0-11
    
    // State for Week selection
    const getWeekNumber = (d: Date) => {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    };
    const [selectedWeek, setSelectedWeek] = useState<number>(getWeekNumber(new Date()));

    const [financialHistory, setFinancialHistory] = useState<FinancialRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    // FETCH AND CALCULATE REAL DATA
    useEffect(() => {
        const fetchFinancialData = async () => {
            setIsLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: userData } = await supabase.from('users').select('organizacao').eq('id', user.id).single();
                const orgId = userData?.organizacao || 0;

                const { data: clients } = await supabase
                    .from('clientes')
                    .select('id, valor_mensal, data_inicio, meses, status');

                const safeClients = clients || [];

                const history: FinancialRecord[] = [];
                // Process last 2 years for YoY comparison
                const yearsToProcess = [selectedYear - 1, selectedYear];
                
                yearsToProcess.forEach(year => {
                    for (let month = 0; month < 12; month++) {
                        const monthStart = new Date(year, month, 1);
                        const monthEnd = new Date(year, month + 1, 0); 
                        
                        let monthMrr = 0;
                        let monthActive = 0;
                        let newClients = 0;
                        let churnedClients = 0;
                        let churnedMrr = 0;

                        safeClients.forEach(c => {
                            if (c.data_inicio && c.meses) {
                                const contractStart = new Date(c.data_inicio);
                                contractStart.setHours(0,0,0,0);
                                
                                const contractEnd = new Date(contractStart);
                                contractEnd.setMonth(contractEnd.getMonth() + c.meses);
                                contractEnd.setHours(23,59,59,999);

                                const isActiveContract = contractStart <= monthEnd && contractEnd >= monthStart;
                                
                                if (isActiveContract && c.status !== 'Bloqueado') {
                                    monthMrr += Number(c.valor_mensal || 0);
                                    monthActive++;
                                }

                                if (contractStart >= monthStart && contractStart <= monthEnd) {
                                    newClients++;
                                }
                                
                                if (contractEnd >= monthStart && contractEnd <= monthEnd && c.status === 'Bloqueado') {
                                    churnedClients++;
                                    churnedMrr += Number(c.valor_mensal || 0);
                                }
                            }
                        });

                        const monthTrans = manualTransactions.filter(t => {
                            const [tYear, tMonth] = t.date.split('-').map(Number);
                            return tMonth - 1 === month && tYear === year;
                        });

                        const manualInflow = monthTrans.filter(t => t.type === 'inflow').reduce((acc, t) => acc + Number(t.amount), 0);
                        
                        const marketingSpend = monthTrans.filter(t => t.type === 'outflow' && t.category === 'Marketing').reduce((acc, t) => acc + Number(t.amount), 0);
                        const salesSpend = monthTrans.filter(t => t.type === 'outflow' && t.category === 'Vendas').reduce((acc, t) => acc + Number(t.amount), 0);
                        
                        const directCosts = monthTrans.filter(t => 
                            t.type === 'outflow' && 
                            ['Infraestrutura', 'Operacional'].includes(t.category)
                        ).reduce((acc, t) => acc + Number(t.amount), 0);

                        const totalOutflow = monthTrans.filter(t => t.type === 'outflow').reduce((acc, t) => acc + Number(t.amount), 0);

                        history.push({
                            id: `hist_${year}_${month}`,
                            date: monthEnd.toISOString().split('T')[0],
                            organizationId: orgId,
                            mrr: monthMrr,
                            gross_revenue: monthMrr + manualInflow, 
                            cogs: directCosts, 
                            total_expenses: totalOutflow,
                            marketing_spend: marketingSpend,
                            sales_spend: salesSpend,
                            active_customers: monthActive,
                            new_customers: newClients,
                            churned_customers: churnedClients,
                            churned_mrr: churnedMrr
                        });
                    }
                });

                setFinancialHistory(history);

            } catch (e) {
                console.error("Erro ao calcular financeiro:", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchFinancialData();
    }, [selectedYear, manualTransactions]); 

    const snapshot = useMemo(() => {
        if (financialHistory.length === 0) return null;

        let currentPeriod: any = {};
        let previousPeriod: any = {}; // YoY Comparison
        let chartData: any[] = [];
        let label = '';
        let comparisonLabel = '';

        // Logic for Week Range
        if (timeRange === 'week') {
            const getWeekData = (year: number, week: number) => {
                // Start of week
                const d = new Date(year, 0, 1 + (week - 1) * 7);
                const dayOfWeek = d.getDay();
                const start = d;
                const end = new Date(d);
                end.setDate(end.getDate() + 6);

                const weekTrans = manualTransactions.filter(t => {
                    const tDate = new Date(t.date);
                    return tDate >= start && tDate <= end;
                });

                const inflow = weekTrans.filter(t => t.type === 'inflow').reduce((acc, t) => acc + t.amount, 0);
                const outflow = weekTrans.filter(t => t.type === 'outflow').reduce((acc, t) => acc + t.amount, 0);
                
                // Prorate MRR for week (Month MRR * 12 / 52)
                const monthIndex = start.getMonth();
                const historyRecord = financialHistory.find(h => {
                    const hDate = new Date(h.date);
                    return hDate.getMonth() === monthIndex && hDate.getFullYear() === year;
                });