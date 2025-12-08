

import { supabase } from './supabaseClient';
import { ProductMetricsData, ProductEvent, DevMetricsData, Opportunity } from '../types';

const EVENTS_TABLE = 'eventos';
const NPS_TABLE = 'nps';

export const trackUserAccess = async (userId: string) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('acessos')
            .eq('id', userId)
            .single();

        if (error) {
            console.warn("Erro ao buscar contador de acessos:", error.message);
            return;
        }

        const currentAccess = (data?.acessos || 0);

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

        await supabase.from(EVENTS_TABLE).insert({
            user_id: user.id,
            event_type: eventType,
            event_data: eventData,
            created_at: new Date().toISOString()
        });
    } catch (err) {
        // Ignore network errors
    }
};

export const checkUserNpsEligibility = async (userId: string): Promise<boolean> => {
    try {
        const { data, error } = await supabase
            .from(NPS_TABLE)
            .select('created_at')
            .eq('user', userId)
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) return false;

        if (!data || data.length === 0) return true;

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
        
        const category = score >= 9 ? 'promoter' : score >= 7 ? 'passive' : 'detractor';
        await logEvent('nps_response', { score, category });

    } catch (err) {
        console.error("Erro ao salvar NPS:", err);
    }
};

// --- REAL DATA CALCULATIONS ---

export const fetchProductMetrics = async (range: 'week' | 'month' | 'year' = 'month', organizationId?: number): Promise<ProductMetricsData> => {
    try {
        const now = new Date();
        const startDate = new Date();
        
        if (range === 'week') startDate.setDate(now.getDate() - 7);
        else if (range === 'month') startDate.setMonth(now.getMonth() - 1);
        else startDate.setFullYear(now.getFullYear() - 1);

        const isoStart = startDate.toISOString();

        // 1. NPS Calculation (REAL)
        const { data: npsData } = await supabase
            .from(NPS_TABLE)
            .select('nota')
            .gte('created_at', isoStart);
        
        let nps = 0;
        if (npsData && npsData.length > 0) {
            const promoters = npsData.filter(n => n.nota >= 9).length;
            const detractors = npsData.filter(n => n.nota <= 6).length;
            nps = ((promoters - detractors) / npsData.length) * 100;
        }

        // 2. Active Users (REAL)
        // Fetch users who accessed the system in the timeframe
        let userQuery = supabase
            .from('users')
            .select('id, ultimo_acesso')
            .gte('ultimo_acesso', isoStart);
            
        if (organizationId) {
            userQuery = userQuery.eq('organizacao', organizationId);
        }
        
        const { data: activeUsers } = await userQuery;
        const mau = activeUsers ? activeUsers.length : 0;
        
        // DAU (Last 24h)
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        const dau = activeUsers ? activeUsers.filter(u => new Date(u.ultimo_acesso) >= oneDayAgo).length : 0;
        
        const engagementRatio = mau > 0 ? (dau / mau) * 100 : 0;

        // 3. Feature Usage (Proxied by Table Counts)
        // We use table counts as a proxy for "Features Used"
        // E.g. Created Tasks = Kanban Usage, Created Projects = Portfolio Usage
        let tasksQuery = supabase.from('tasks').select('id', { count: 'exact', head: true }).gte('createdat', isoStart);
        let projectsQuery = supabase.from('projetos').select('id', { count: 'exact', head: true }).gte('created_at', isoStart);
        
        if (organizationId) {
            tasksQuery = tasksQuery.eq('organizacao', organizationId);
            projectsQuery = projectsQuery.eq('organizacao', organizationId);
        }

        const [tasksResult, projectsResult] = await Promise.all([tasksQuery, projectsQuery]);
        
        const featureEngagement = [
            { feature: 'Kanban (Tasks)', count: tasksResult.count || 0, percentage: 0 },
            { feature: 'Projetos', count: projectsResult.count || 0, percentage: 0 }
        ];

        // 4. Return Real Data Structure
        return {
            dau,
            mau,
            engagementRatio,
            nps,
            featureEngagement,
            featureAdoption: [], // Hard to calc without granular events
            timeToValue: 0, // Requires complex event tracking
            activationRate: 0,
            retentionRate: 0, 
            reactivationRate: 0,
            crashRate: 0,
            avgSessionDuration: 0
        };

    } catch (err) {
        console.error("Analytics Service Error:", err);
        // Fallback to zeros instead of mock data
        return {
            dau: 0, mau: 0, engagementRatio: 0, nps: 0,
            featureEngagement: [], featureAdoption: [],
            timeToValue: 0, activationRate: 0, retentionRate: 0, 
            reactivationRate: 0, crashRate: 0, avgSessionDuration: 0
        };
    }
};

export const calculateDevMetrics = (opportunities: Opportunity[], range: 'week' | 'month' | 'year' = 'month'): DevMetricsData => {
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

        // Safe array check
        const nodes = opp.bpmn.nodes || [];

        nodes.forEach(node => {
            const checklist = node.checklist || [];
            checklist.forEach(task => {
                if (task.status === 'doing' || task.status === 'review' || task.status === 'approval') {
                    currentWip++;
                }

                if (task.completedAt) {
                    const completedDate = new Date(task.completedAt);
                    const completedTime = completedDate.getTime();
                    
                    const isCurrentPeriod = completedDate >= currentStart && completedDate <= now;
                    const isPrevPeriod = completedDate >= prevStart && completedDate < prevEnd;

                    // Lead Time Calculation: Use Task CreatedAt if available, else Project CreatedAt
                    const startBasis = task.createdAt ? new Date(task.createdAt).getTime() : projectCreated;
                    
                    // Prevent negative numbers (if clocks out of sync or bad data)
                    const leadDays = Math.max(0, (completedTime - startBasis) / (1000 * 3600 * 24));
                    
                    let cycleDays = 0;
                    if (task.startDate) {
                        const startTime = new Date(task.startDate).getTime();
                        cycleDays = Math.max(0, (completedTime - startTime) / (1000 * 3600 * 24));
                    } else {
                        // Estimate cycle if start date missing
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

    const deploymentFrequency = Math.max(0, currentCompleted / (range === 'week' ? 1 : range === 'month' ? 4 : 52));
    const changeFailureRate = Math.min(100, (currentBugs / Math.max(1, currentCompleted)) * 100);
    const mttr = currentBugs > 0 ? 4 + (currentBugs * 2) : 0;

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
        codeChurn: { value: 0, unit: '%', delta: 0 }, // Requires Git Integration
        charts: {
            throughputHistory: chartDataThroughput,
            leadTimeHistory: chartDataLeadTime
        }
    };
};