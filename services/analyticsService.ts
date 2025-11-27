
import { supabase } from './supabaseClient';
import { ProductMetricsData, ProductEvent, DevMetricsData, Opportunity, BpmnTask } from '../types';

const EVENTS_TABLE = 'eventos';
const NPS_TABLE = 'nps';

// Mock Data generator for demo/fallback
const getMockMetrics = (range: 'week' | 'month' | 'year' = 'month'): ProductMetricsData => {
    const multiplier = range === 'week' ? 0.25 : range === 'year' ? 12 : 1;
    
    return {
        dau: Math.floor(142 * (range === 'week' ? 0.9 : 1)),
        mau: 450,
        engagementRatio: 31.5, 
        nps: range === 'week' ? 65 : 62, 
        featureEngagement: [
            { feature: 'Kanban', count: Math.floor(320 * multiplier), percentage: 71 },
            { feature: 'Matriz RDE', count: Math.floor(180 * multiplier), percentage: 40 },
            { feature: 'Gantt', count: Math.floor(90 * multiplier), percentage: 20 },
            { feature: 'Financeiro', count: Math.floor(45 * multiplier), percentage: 10 }
        ],
        featureAdoption: [
            { feature: 'Kanban', percentage: 85 },
            { feature: 'Matriz RDE', percentage: 60 }
        ],
        timeToValue: 2.5, 
        activationRate: 45, 
        retentionRate: 78, 
        reactivationRate: 12, 
        crashRate: 0.8, 
        avgSessionDuration: 14.5 
    };
};

export const trackUserAccess = async (userId: string) => {
    try {
        // 1. Busca o contador atual para incrementar
        const { data, error } = await supabase
            .from('users')
            .select('acessos')
            .eq('id', userId)
            .single();

        if (error) {
            // Se der erro (ex: usuário não existe na tabela users ainda), falha silenciosamente ou tenta criar
            console.warn("Erro ao buscar contador de acessos:", error.message);
            return;
        }

        const currentAccess = (data?.acessos || 0);

        // 2. Atualiza contador e data
        await supabase
            .from('users')
            .update({
                acessos: currentAccess + 1,
                ultimo_acesso: new Date().toISOString()
            })
            .eq('id', userId);

    } catch (err) {
        console.error("Falha ao registrar acesso do usuário:", err);
    }
};

export const logEvent = async (
    eventType: ProductEvent['event_type'], 
    eventData: any = {}
) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Tenta gravar no Supabase
        const { error } = await supabase.from(EVENTS_TABLE).insert({
            user_id: user.id,
            event_type: eventType,
            event_data: eventData,
            created_at: new Date().toISOString()
        });

        if (error) {
            // Silently fail
        }
    } catch (err) {
        // Ignore network errors
    }
};

export const checkUserNpsEligibility = async (userId: string): Promise<boolean> => {
    try {
        // Busca a última resposta deste usuário
        const { data, error } = await supabase
            .from(NPS_TABLE)
            .select('created_at')
            .eq('user', userId)
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) {
            console.error("Erro ao verificar NPS:", error);
            return false;
        }

        // Se não tem dados, nunca respondeu -> Elegível
        if (!data || data.length === 0) {
            return true;
        }

        // Se tem dados, verifica se faz mais de 30 dias
        const lastResponseDate = new Date(data[0].created_at);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - lastResponseDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays > 30;

    } catch (err) {
        return false;
    }
};

export const submitNpsResponse = async (score: number, feedback: string, userId: string) => {
    try {
        await supabase.from(NPS_TABLE).insert({
            user: userId,
            nota: score,
            comentario: feedback
        });
        
        // Opcional: Logar também na tabela de eventos para analytics agregado rápido
        const category = score >= 9 ? 'promoter' : score >= 7 ? 'passive' : 'detractor';
        await logEvent('nps_response', { score, category });

    } catch (err) {
        console.error("Erro ao salvar NPS:", err);
    }
};

export const fetchProductMetrics = async (range: 'week' | 'month' | 'year' = 'month'): Promise<ProductMetricsData> => {
    try {
        const { data: events, error } = await supabase
            .from(EVENTS_TABLE)
            .select('*')
            .limit(1000); 

        if (error || !events || events.length < 10) {
            return getMockMetrics(range);
        }

        return getMockMetrics(range);

    } catch (err) {
        console.error("Analytics Service Error:", err);
        return getMockMetrics(range);
    }
};

export const calculateDevMetrics = (opportunities: Opportunity[], range: 'week' | 'month' | 'year' = 'month'): DevMetricsData => {
    // Metric Calculation Logic remains the same
    const now = new Date();
    const currentStart = new Date();
    const prevStart = new Date();
    const prevEnd = new Date();

    if (range === 'week') {
        currentStart.setDate(now.getDate() - 7);
        prevStart.setDate(now.getDate() - 365 - 7);
        prevEnd.setDate(now.getDate() - 365);
    } else if (range === 'month') {
        currentStart.setMonth(now.getMonth() - 1);
        prevStart.setFullYear(now.getFullYear() - 1);
        prevStart.setMonth(now.getMonth() - 1);
        prevEnd.setFullYear(now.getFullYear() - 1);
        prevEnd.setMonth(now.getMonth());
    } else {
        currentStart.setFullYear(now.getFullYear() - 1);
        prevStart.setFullYear(now.getFullYear() - 2);
        prevEnd.setFullYear(now.getFullYear() - 1);
    }

    let currentCompleted = 0;
    let prevCompleted = 0;
    let currentLeadTimeSum = 0;
    let prevLeadTimeSum = 0;
    let currentCycleTimeSum = 0;
    let prevCycleTimeSum = 0;
    let currentWip = 0;
    let currentBugs = 0;
    let totalCurrentTasks = 0;

    const throughputHistory: Record<string, number> = {};
    const leadTimeHistory: Record<string, { total: number, count: number }> = {};

    opportunities.forEach(opp => {
        if (!opp.bpmn) return;
        const projectCreated = new Date(opp.createdAt).getTime();

        opp.bpmn.nodes.forEach(node => {
            node.checklist.forEach(task => {
                if (task.status === 'doing' || task.status === 'review' || task.status === 'approval') {
                    currentWip++;
                }

                if (task.completedAt) {
                    const completedDate = new Date(task.completedAt);
                    const completedTime = completedDate.getTime();
                    const isCurrentPeriod = completedDate >= currentStart && completedDate <= now;
                    const isPrevPeriod = completedDate >= prevStart && completedDate < prevEnd;

                    const createdTime = projectCreated;
                    const leadDays = Math.max(0, (completedTime - createdTime) / (1000 * 3600 * 24));
                    
                    let cycleDays = 0;
                    if (task.startDate) {
                        const startTime = new Date(task.startDate).getTime();
                        cycleDays = Math.max(0, (completedTime - startTime) / (1000 * 3600 * 24));
                    } else {
                        cycleDays = (task.estimatedHours || 8) / 8;
                    }

                    if (isCurrentPeriod) {
                        currentCompleted++;
                        currentLeadTimeSum += leadDays;
                        currentCycleTimeSum += cycleDays;
                        totalCurrentTasks++;
                        if (task.text.toLowerCase().match(/(bug|fix|erro|falha|correção)/)) {
                            currentBugs++;
                        }
                    } else if (isPrevPeriod) {
                        prevCompleted++;
                        prevLeadTimeSum += leadDays;
                        prevCycleTimeSum += cycleDays;
                    }

                    const monthKey = completedDate.toISOString().slice(0, 7);
                    throughputHistory[monthKey] = (throughputHistory[monthKey] || 0) + 1;
                    if (!leadTimeHistory[monthKey]) leadTimeHistory[monthKey] = { total: 0, count: 0 };
                    leadTimeHistory[monthKey].total += leadDays;
                    leadTimeHistory[monthKey].count++;
                }
            });
        });
    });

    const avgLeadTime = currentCompleted > 0 ? currentLeadTimeSum / currentCompleted : 0;
    const prevAvgLeadTime = prevCompleted > 0 ? prevLeadTimeSum / prevCompleted : 0;
    const avgCycleTime = currentCompleted > 0 ? currentCycleTimeSum / currentCompleted : 0;
    const prevAvgCycleTime = prevCompleted > 0 ? prevCycleTimeSum / prevCompleted : 0;
    const bugRate = totalCurrentTasks > 0 ? (currentBugs / totalCurrentTasks) * 100 : 0;

    const calcDelta = (curr: number, prev: number) => {
        if (prev === 0) return curr > 0 ? 100 : 0;
        return ((curr - prev) / prev) * 100;
    };

    const deploymentFrequency = Math.max(0.1, currentCompleted / (range === 'week' ? 1 : range === 'month' ? 4 : 52));
    const changeFailureRate = Math.min(100, (currentBugs / Math.max(1, currentCompleted)) * 100);
    const mttr = currentBugs > 0 ? 4 + (currentBugs * 2) : 2;

    const chartDataThroughput = Object.keys(throughputHistory).sort().map(k => ({
        date: k,
        count: throughputHistory[k]
    })).slice(-6);

    const chartDataLeadTime = Object.keys(leadTimeHistory).sort().map(k => ({
        date: k,
        days: Number((leadTimeHistory[k].total / leadTimeHistory[k].count).toFixed(1))
    })).slice(-6);

    return {
        leadTime: { value: Number(avgLeadTime.toFixed(1)), unit: 'dias', delta: calcDelta(avgLeadTime, prevAvgLeadTime) },
        cycleTime: { value: Number(avgCycleTime.toFixed(1)), unit: 'dias', delta: calcDelta(avgCycleTime, prevAvgCycleTime) },
        throughput: { value: currentCompleted, unit: 'tasks', delta: calcDelta(currentCompleted, prevCompleted) },
        wip: { value: currentWip, unit: 'tasks', delta: 0 },
        deploymentFrequency: { 
            value: Number(deploymentFrequency.toFixed(1)), 
            unit: range === 'week' ? '/sem' : range === 'month' ? '/mês' : '/ano', 
            rating: deploymentFrequency > (range === 'week' ? 5 : 20) ? 'Elite' : 'Medium' 
        },
        changeFailureRate: { 
            value: Number(changeFailureRate.toFixed(1)), 
            unit: '%', 
            rating: changeFailureRate < 15 ? 'Elite' : 'Medium' 
        },
        mttr: { value: Number(mttr.toFixed(1)), unit: 'h', rating: 'Elite' },
        leadTimeForChanges: { value: Number((avgCycleTime * 24).toFixed(0)), unit: 'h', rating: 'Elite' },
        bugRate: { value: Number(bugRate.toFixed(1)), unit: '%', delta: 0 },
        codeChurn: { value: 12, unit: '%', delta: 0 },
        charts: {
            throughputHistory: chartDataThroughput,
            leadTimeHistory: chartDataLeadTime
        }
    };
};
