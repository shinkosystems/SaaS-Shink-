
import React, { useState, useEffect } from 'react';
import { fetchAllOwners, updateGlobalClientData, fetchPlans, fetchGlobalMetrics, AdminUser, GlobalMetrics, updateUserStatus } from '../services/adminService';
import { DbPlan } from '../types';
import { Shield, Search, CreditCard, Loader2, Edit, CheckCircle, AlertTriangle, User, Zap, Building2, Users, DollarSign, TrendingUp, Activity, Filter, Calendar, Heart, UserMinus, Gem, MousePointer2, X, Clock, BarChart3, Wifi, Lock } from 'lucide-react';

interface Props {
    onlineUsers?: string[];
}

export const AdminManagerScreen: React.FC<Props> = ({ onlineUsers = [] }) => {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [plans, setPlans] = useState<DbPlan[]>([]);
    const [metrics, setMetrics] = useState<GlobalMetrics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // DASHBOARD Filters (Metrics Only)
    const [dashStart, setDashStart] = useState<string>(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]); // Start of Year
    const [dashEnd, setDashEnd] = useState<string>(new Date().toISOString().split('T')[0]); // Today
    const [isRefreshingMetrics, setIsRefreshingMetrics] = useState(false);

    // TABLE Filters State (User List Only)
    const [searchTerm, setSearchTerm] = useState('');
    const [filterPlan, setFilterPlan] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterStart, setFilterStart] = useState<string>('');
    const [filterEnd, setFilterEnd] = useState<string>('');

    // Modal State
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
    
    // Form Fields
    const [userName, setUserName] = useState('');
    const [orgName, setOrgName] = useState('');
    const [orgLimit, setOrgLimit] = useState(1);
    const [userStatus, setUserStatus] = useState('Ativo'); // New Field
    const [selectedPlanId, setSelectedPlanId] = useState<number | ''>('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    // Effect to reload metrics when Dashboard Date changes
    useEffect(() => {
        if (!isLoading) {
            refreshMetrics();
        }
    }, [dashStart, dashEnd]);

    const refreshMetrics = async () => {
        setIsRefreshingMetrics(true);
        const data = await fetchGlobalMetrics(dashStart, dashEnd);
        setMetrics(data);
        setIsRefreshingMetrics(false);
    }

    const loadData = async () => {
        setIsLoading(true);
        const [usersData, plansData, metricsData] = await Promise.all([
            fetchAllOwners(),
            fetchPlans(),
            fetchGlobalMetrics(dashStart, dashEnd)
        ]);
        setUsers(usersData);
        setPlans(plansData);
        setMetrics(metricsData);
        setIsLoading(false);
    };

    const handleQuickDashFilter = (days: number) => {
        const end = new Date();
        const start = new Date();
        if (days === 3650) {
             // All time
             start.setFullYear(start.getFullYear() - 10);
        } else if (days === 365) {
             // This Year
             start.setMonth(0, 1);
        } else {
             start.setDate(end.getDate() - days);
        }
        setDashStart(start.toISOString().split('T')[0]);
        setDashEnd(end.toISOString().split('T')[0]);
    };

    const handleEdit = (user: AdminUser) => {
        setEditingUser(user);
        
        // Populate Form
        setUserName(user.nome || '');
        setOrgName(user.orgName || '');
        setOrgLimit(user.orgColaboradores || 1);
        setUserStatus(user.status || 'Ativo'); // Populate status
        setSelectedPlanId(user.currentPlanId || '');
        setStartDate(user.subscription_start || new Date().toISOString().split('T')[0]);
        
        if (user.subscription_end) {
            setEndDate(user.subscription_end);
        } else {
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            setEndDate(nextMonth.toISOString().split('T')[0]);
        }
    };

    const handleSave = async () => {
        if (!editingUser) return;
        
        if (selectedPlanId === '') {
            alert("Selecione um plano.");
            return;
        }
        
        const plan = plans.find(p => p.id === Number(selectedPlanId));
        if (!plan) return;

        setIsSaving(true);
        
        const result = await updateGlobalClientData({
            userId: editingUser.id,
            orgId: editingUser.organizacao,
            userName: userName,
            orgName: orgName,
            orgLimit: orgLimit,
            userStatus: userStatus, // Pass status
            planId: plan.id,
            start: startDate,
            end: endDate,
            value: plan.valor
        });

        if (result.success) {
            setUsers(prev => prev.map(u => u.id === editingUser.id ? { 
                ...u,
                nome: userName,
                orgName: orgName,
                orgColaboradores: orgLimit,
                status: userStatus,
                planName: plan.nome,
                currentPlanId: plan.id,
                subscription_start: startDate, 
                subscription_end: endDate 
            } : u));
            
            setEditingUser(null);
            alert("Dados atualizados com sucesso!");
            refreshMetrics();
        } else {
            alert(`Erro ao atualizar: ${result.msg}`);
        }
        setIsSaving(false);
    };

    const handleStatusChange = async (userId: string, newStatus: string) => {
        const originalUsers = [...users];
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
        
        const result = await updateUserStatus(userId, newStatus);
        
        if (!result.success) {
            alert('Falha ao atualizar status do usuário.');
            setUsers(originalUsers);
        }
    };

    // --- FILTER LOGIC ---
    const filteredUsers = users.filter(u => {
        const matchesSearch = 
            u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (u.orgName && u.orgName.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesPlan = filterPlan === 'all' || (u.planName && u.planName.includes(filterPlan));
        
        const matchesStatus = filterStatus === 'all' || u.status === filterStatus;

        let matchesDate = true;
        if (filterStart && u.subscription_start) {
            matchesDate = matchesDate && u.subscription_start >= filterStart;
        }
        if (filterEnd && u.subscription_start) {
            matchesDate = matchesDate && u.subscription_start <= filterEnd;
        }

        return matchesSearch && matchesPlan && matchesStatus && matchesDate;
    });

    const getPlanColor = (planName?: string) => {
        if (!planName) return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
        const name = planName.toLowerCase();
        if (name.includes('scale')) return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
        if (name.includes('studio')) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
        if (name.includes('consultant')) return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    };

    const getStatusBadge = (status: string) => {
        const s = status || 'Pendente';
        if (s === 'Ativo' || s === 'Aprovado') {
            return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
        }
        if (s === 'Pendente') {
            return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800';
        }
        return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
    };

    return (
        <div className="flex flex-col animate-in fade-in duration-500">
            
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                    <Shield className="w-8 h-8 text-purple-600"/> Painel Gestor (Super Admin)
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Visão 360º de clientes, assinaturas e saúde global do SaaS para Investidores.
                </p>
            </div>

            {/* Metrics Dashboard Control Bar */}
            <div className="mb-6 bg-slate-100 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 px-2">
                    <BarChart3 className="w-5 h-5 text-slate-500"/>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Filtro de Indicadores</span>
                </div>
                
                <div className="flex items-center gap-3 flex-wrap justify-end w-full md:w-auto">
                    <div className="flex bg-white dark:bg-black/20 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                        <button onClick={() => handleQuickDashFilter(30)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">30 Dias</button>
                        <button onClick={() => handleQuickDashFilter(90)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors border-l border-slate-200 dark:border-white/10">Trimestre</button>
                        <button onClick={() => handleQuickDashFilter(365)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors border-l border-slate-200 dark:border-white/10">Este Ano</button>
                    </div>

                    <div className="flex items-center gap-2 bg-white dark:bg-black/20 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        <Calendar className="w-4 h-4 text-slate-400"/>
                        <input 
                            type="date" 
                            value={dashStart}
                            onChange={e => setDashStart(e.target.value)}
                            className="bg-transparent text-xs font-bold text-slate-700 dark:text-white outline-none w-24"
                        />
                        <span className="text-slate-400">-</span>
                        <input 
                            type="date" 
                            value={dashEnd}
                            onChange={e => setDashEnd(e.target.value)}
                            className="bg-transparent text-xs font-bold text-slate-700 dark:text-white outline-none w-24"
                        />
                    </div>
                    {isRefreshingMetrics && <Loader2 className="w-4 h-4 animate-spin text-purple-500"/>}
                </div>
            </div>

            {/* Metrics Dashboard */}
            {metrics && (
                <div className={`space-y-6 mb-8 transition-opacity duration-300 ${isRefreshingMetrics ? 'opacity-50' : 'opacity-100'}`}>
                    
                    {/* Row 1: Financial Health */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-900/60 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-emerald-500"/> MRR (Fim do Período)
                                </span>
                            </div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white">
                                R$ {metrics.totalMrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">Receita Recorrente Mensal</div>
                        </div>

                        <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-900/60 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                    <Users className="w-4 h-4 text-blue-500"/> Clientes Ativos
                                </span>
                            </div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white">
                                {metrics.activeClients}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">No período selecionado</div>
                        </div>

                        <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-900/60 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-purple-500"/> Ticket Médio
                                </span>
                            </div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white">
                                R$ {metrics.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">Por cliente ativo</div>
                        </div>

                        <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-900/60 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-amber-500"/> Novos Usuários
                                </span>
                            </div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white">
                                +{metrics.totalUsers}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">Crescimento no período</div>
                        </div>
                    </div>

                    {/* Row 2: Product & Health Indicators */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-900/60 shadow-sm flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                    <Heart className="w-4 h-4 text-pink-500"/> NPS (No Período)
                                </span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${metrics.npsScore > 50 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                    {metrics.npsScore > 50 ? 'Excelente' : 'Médio'}
                                </span>
                            </div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                                {metrics.npsScore}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">Satisfação Média</div>
                        </div>

                        <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-900/60 shadow-sm flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                    <UserMinus className="w-4 h-4 text-red-500"/> Churn Rate
                                </span>
                            </div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                                {metrics.churnRate.toFixed(1)}%
                            </div>
                            <div className="text-xs text-slate-400 mt-1">Global (All-time)</div>
                        </div>

                        <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-900/60 shadow-sm flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                    <Gem className="w-4 h-4 text-blue-500"/> LTV Global
                                </span>
                            </div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                                R$ {metrics.ltv.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">Valor Vitalício (Est.)</div>
                        </div>

                        <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-900/60 shadow-sm flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                    <MousePointer2 className="w-4 h-4 text-orange-500"/> Engajamento
                                </span>
                            </div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                                {metrics.mau > 0 ? ((metrics.dau / metrics.mau) * 100).toFixed(1) : 0}%
                            </div>
                            <div className="text-xs text-slate-400 mt-1">Ratio DAU/MAU</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filter Bar */}
            <div className="flex flex-col xl:flex-row gap-4 mb-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 items-center mt-8">
                <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400"/>
                    <input 
                        type="text" 
                        placeholder="Buscar cliente na lista..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-purple-500 shadow-sm"
                    />
                </div>
                
                <div className="flex gap-2 w-full xl:w-auto overflow-x-auto no-scrollbar">
                    <div className="relative min-w-[140px]">
                        <select 
                            value={filterPlan} 
                            onChange={e => setFilterPlan(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none appearance-none cursor-pointer"
                        >
                            <option value="all">Todos Planos</option>
                            <option value="Scale">Scale</option>
                            <option value="Studio">Studio</option>
                            <option value="Consultant">Consultant</option>
                            <option value="Trial">Trial / Free</option>
                        </select>
                        <CreditCard className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none"/>
                    </div>

                    <div className="relative min-w-[140px]">
                        <select 
                            value={filterStatus} 
                            onChange={e => setFilterStatus(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none appearance-none cursor-pointer"
                        >
                            <option value="all">Todos Status</option>
                            <option value="Ativo">Ativo / Aprovado</option>
                            <option value="Pendente">Pendente</option>
                            <option value="Bloqueado">Bloqueado</option>
                        </select>
                        <Filter className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none"/>
                    </div>

                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1">
                        <Calendar className="w-4 h-4 text-slate-400"/>
                        <input 
                            type="date" 
                            value={filterStart}
                            onChange={e => setFilterStart(e.target.value)}
                            className="bg-transparent text-sm outline-none text-slate-600 dark:text-slate-300 w-24"
                        />
                        <span className="text-slate-400">-</span>
                        <input 
                            type="date" 
                            value={filterEnd}
                            onChange={e => setFilterEnd(e.target.value)}
                            className="bg-transparent text-sm outline-none text-slate-600 dark:text-slate-300 w-24"
                        />
                        {(filterStart || filterEnd) && (
                            <button 
                                onClick={() => { setFilterStart(''); setFilterEnd(''); }}
                                className="ml-1 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-red-500 transition-colors"
                                title="Limpar Datas"
                            >
                                <X className="w-3 h-3"/>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative">
                {isLoading ? (
                    <div className="p-12 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-500"/>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="p-4 font-medium">Cliente (Dono)</th>
                                <th className="p-4 font-medium">Empresa (Org)</th>
                                <th className="p-4 font-medium text-center">Status Online</th>
                                <th className="p-4 font-medium text-center">Acessos</th>
                                <th className="p-4 font-medium">Último Login</th>
                                <th className="p-4 font-medium">Plano Atual</th>
                                <th className="p-4 font-medium">Vigência</th>
                                <th className="p-4 font-medium text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-slate-500 italic">
                                        Nenhum cliente encontrado com os filtros selecionados.
                                    </td>
                                </tr>
                            )}
                            {filteredUsers.map(user => {
                                const isExpired = user.subscription_end && new Date(user.subscription_end) < new Date();
                                const isOnline = onlineUsers.includes(user.id);
                                return (
                                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                    <User className="w-3 h-3 text-slate-400"/> {user.nome}
                                                </span>
                                                <span className="text-xs text-slate-500">{user.email}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                                    <Building2 className="w-3 h-3 text-slate-400"/> {user.orgName}
                                                </span>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs text-slate-500 flex items-center gap-1">
                                                        <Users className="w-3 h-3"/> Max: {user.orgColaboradores}
                                                    </span>
                                                    <select
                                                        value={user.status || 'Pendente'}
                                                        onChange={(e) => handleStatusChange(user.id, e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className={`appearance-none text-[10px] px-1.5 py-0.5 rounded font-bold uppercase border cursor-pointer focus:ring-2 focus:ring-purple-500 outline-none ${getStatusBadge(user.status)}`}
                                                    >
                                                        <option value="Ativo" className="dark:bg-slate-900 font-sans">Ativo</option>
                                                        <option value="Aprovado" className="dark:bg-slate-900 font-sans">Aprovado</option>
                                                        <option value="Pendente" className="dark:bg-slate-900 font-sans">Pendente</option>
                                                        <option value="Bloqueado" className="dark:bg-slate-900 font-sans">Bloqueado</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </td>
                                        
                                        {/* Status Online */}
                                        <td className="p-4 text-center">
                                            {isOnline ? (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 animate-pulse shadow-sm">
                                                    <Wifi className="w-3 h-3"/> Online Agora
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                                    Offline
                                                </span>
                                            )}
                                        </td>

                                        {/* Acessos */}
                                        <td className="p-4 text-center">
                                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                {user.acessos || 0}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <Clock className="w-3 h-3"/>
                                                {user.ultimo_acesso ? new Date(user.ultimo_acesso).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit'}) : 'Nunca'}
                                            </div>
                                        </td>

                                        {/* Plano */}
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold border ${getPlanColor(user.planName)}`}>
                                                {user.planName || 'Sem Plano'}
                                            </span>
                                        </td>
                                        
                                        {/* Vigência */}
                                        <td className="p-4">
                                            <div className="flex flex-col text-xs">
                                                <span className="text-emerald-500">Início: {user.subscription_start ? new Date(user.subscription_start).toLocaleDateString() : '-'}</span>
                                                <span className={`${user.subscription_end && new Date(user.subscription_end) < new Date() ? 'text-red-500 font-bold' : 'text-slate-500'}`}>
                                                    Fim: {user.subscription_end ? new Date(user.subscription_end).toLocaleDateString() : '-'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button 
                                                onClick={() => handleEdit(user)}
                                                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-slate-600 dark:text-slate-300 hover:text-purple-600 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-2"
                                            >
                                                <Edit className="w-3 h-3"/> Editar
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Edit Modal (Expanded) */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="glass-panel w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-ios-pop border border-white/10 relative flex flex-col max-h-[90vh]">
                        
                        <div className="px-6 py-4 border-b border-white/10 bg-white/5 flex justify-between items-center shrink-0">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Shield className="w-5 h-5 text-purple-500"/> Gerenciar Cliente
                            </h3>
                            <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white"><Zap className="w-5 h-5 rotate-45"/></button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                            
                            {/* Section 1: User & Organization */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 border-b border-white/10 pb-1">
                                        <User className="w-3 h-3"/> Dados do Cliente
                                    </h4>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Nome Completo</label>
                                        <input 
                                            type="text" 
                                            value={userName}
                                            onChange={e => setUserName(e.target.value)}
                                            className="w-full glass-input rounded-lg p-2.5 outline-none focus:border-purple-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Status de Acesso</label>
                                        <select 
                                            value={userStatus}
                                            onChange={e => setUserStatus(e.target.value)}
                                            className="w-full glass-input rounded-lg p-2.5 outline-none focus:border-purple-500 appearance-none cursor-pointer font-bold"
                                        >
                                            <option value="Ativo" className="text-emerald-500 bg-white dark:bg-slate-900">Ativo / Aprovado (Liberado)</option>
                                            <option value="Aprovado" className="text-emerald-500 bg-white dark:bg-slate-900">Aprovado (Liberado)</option>
                                            <option value="Pendente" className="text-amber-500 bg-white dark:bg-slate-900">Pendente (Aguardando)</option>
                                            <option value="Bloqueado" className="text-red-500 bg-white dark:bg-slate-900">Bloqueado (Negado)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 border-b border-white/10 pb-1">
                                        <Building2 className="w-3 h-3"/> Dados da Organização
                                    </h4>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Nome da Empresa</label>
                                        <input 
                                            type="text" 
                                            value={orgName}
                                            onChange={e => setOrgName(e.target.value)}
                                            className="w-full glass-input rounded-lg p-2.5 outline-none focus:border-purple-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Limite de Colaboradores</label>
                                        <input 
                                            type="number" 
                                            value={orgLimit}
                                            onChange={e => setOrgLimit(Number(e.target.value))}
                                            className="w-full glass-input rounded-lg p-2.5 outline-none focus:border-purple-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Subscription */}
                            <div className="pt-4 border-t border-white/10 space-y-4">
                                <h4 className="text-xs font-bold text-purple-500 uppercase flex items-center gap-2 border-b border-purple-500/20 pb-1">
                                    <CreditCard className="w-3 h-3"/> Plano & Assinatura
                                </h4>
                                
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Plano Selecionado</label>
                                    <select 
                                        value={selectedPlanId}
                                        onChange={e => setSelectedPlanId(Number(e.target.value))}
                                        className="w-full glass-input rounded-lg p-3 outline-none focus:border-purple-500 appearance-none bg-white dark:bg-slate-950 font-bold"
                                    >
                                        <option value="" className="dark:bg-slate-900">Selecione...</option>
                                        {plans.map(p => (
                                            <option key={p.id} value={p.id} className="dark:bg-slate-900">
                                                {p.nome} - R$ {p.valor} ({p.meses} meses)
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Data Início</label>
                                        <input 
                                            type="date" 
                                            value={startDate} 
                                            onChange={e => setStartDate(e.target.value)}
                                            className="w-full glass-input rounded-lg p-3 outline-none focus:border-purple-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Data Final</label>
                                        <input 
                                            type="date" 
                                            value={endDate} 
                                            onChange={e => setEndDate(e.target.value)}
                                            className="w-full glass-input rounded-lg p-3 outline-none focus:border-purple-500"
                                        />
                                    </div>
                                </div>

                                {endDate && new Date(endDate) < new Date() && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-500 font-bold flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4"/> Atenção: A data final está no passado. O acesso do cliente pode ser bloqueado.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end gap-3 shrink-0">
                            <button onClick={() => setEditingUser(null)} className="px-4 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-white/5 transition-colors">Cancelar</button>
                            <button 
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-6 py-2 rounded-lg text-sm font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg flex items-center gap-2 transition-transform active:scale-95"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle className="w-4 h-4"/>}
                                Salvar Alterações
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
