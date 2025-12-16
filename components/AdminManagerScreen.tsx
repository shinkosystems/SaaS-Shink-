
import React, { useState, useEffect, useRef } from 'react';
import { fetchAllOwners, updateGlobalClientData, fetchPlans, fetchGlobalMetrics, AdminUser, GlobalMetrics, updateUserStatus, fetchPendingApprovals, approveSubscription } from '../services/adminService';
import { fetchCmsCases, saveCmsCase, deleteCmsCase, fetchCmsPosts, saveCmsPost, deleteCmsPost, uploadCmsFile } from '../services/cmsService';
import { DbPlan, FinancialTransaction, CmsCase, CmsPost } from '../types';
import { Shield, Search, CreditCard, Loader2, Edit, CheckCircle, AlertTriangle, User, Zap, Building2, Users, DollarSign, TrendingUp, Activity, Filter, Calendar, Heart, UserMinus, Gem, MousePointer2, X, Clock, BarChart3, Wifi, Lock, ExternalLink, Check, Briefcase, FileText, Image as ImageIcon, Link as LinkIcon, Download, Save, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { RichTextEditor } from './RichTextEditor';

interface Props {
    onlineUsers?: string[];
}

export const AdminManagerScreen: React.FC<Props> = ({ onlineUsers = [] }) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'clients' | 'approvals' | 'cms_cases' | 'cms_blog'>('dashboard');
    
    // Main Data
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [plans, setPlans] = useState<DbPlan[]>([]);
    const [metrics, setMetrics] = useState<GlobalMetrics | null>(null);
    const [approvals, setApprovals] = useState<FinancialTransaction[]>([]);
    
    // CMS Data
    const [cmsCases, setCmsCases] = useState<CmsCase[]>([]);
    const [cmsPosts, setCmsPosts] = useState<CmsPost[]>([]);
    const [editingCase, setEditingCase] = useState<Partial<CmsCase> | null>(null);
    const [editingPost, setEditingPost] = useState<Partial<CmsPost> | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingApprovals, setIsLoadingApprovals] = useState(false);
    const [approvingId, setApprovingId] = useState<string | null>(null);
    
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
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadData();
    }, []);

    // Effect to reload metrics when Dashboard Date changes
    useEffect(() => {
        if (!isLoading) {
            refreshMetrics();
        }
    }, [dashStart, dashEnd]);

    // Load Tab Specific Data
    useEffect(() => {
        if (activeTab === 'approvals') loadApprovals();
        if (activeTab === 'cms_cases') loadCmsCases();
        if (activeTab === 'cms_blog') loadCmsPosts();
    }, [activeTab]);

    const loadApprovals = async () => {
        setIsLoadingApprovals(true);
        const data = await fetchPendingApprovals();
        setApprovals(data);
        setIsLoadingApprovals(false);
    };

    const loadCmsCases = async () => {
        const data = await fetchCmsCases();
        setCmsCases(data);
    };

    const loadCmsPosts = async () => {
        const data = await fetchCmsPosts(false); // Fetch all including drafts
        setCmsPosts(data);
    };

    const handleApprove = async (transactionId: string | number, orgId: number) => {
        console.log("Clique em Aprovar detectado:", transactionId, orgId);

        if (!orgId) {
            alert("Erro crítico: ID da Organização inválido/não encontrado na transação.");
            return;
        }

        if (!window.confirm("Confirmar aprovação do pagamento?\nIsso liberará o acesso e estenderá o vencimento.")) return;
        
        const safeId = String(transactionId);
        setApprovingId(safeId);
        
        try {
            console.log(`[AdminManager] Chamando serviço para aprovar ${safeId}...`);
            const res = await approveSubscription(safeId, orgId);
            
            if (res.success) {
                // UI Feedback: Remove immediately
                setApprovals(prev => prev.filter(t => String(t.id) !== safeId));
                alert("✅ Pagamento aprovado e plano liberado com sucesso!");
            } else {
                console.error("Erro no serviço:", res.msg);
                alert(`❌ Falha ao aprovar: ${res.msg}`);
            }
        } catch (e: any) {
            console.error("Exceção no handleApprove:", e);
            alert("Erro inesperado: " + e.message);
        } finally {
            setApprovingId(null);
        }
    };

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

    // --- CMS HANDLERS ---

    const handleSaveCase = async () => {
        if (!editingCase || !editingCase.title) return alert("Título obrigatório");
        setIsSaving(true);
        try {
            await saveCmsCase(editingCase);
            setEditingCase(null);
            loadCmsCases();
        } catch (e) { alert("Erro ao salvar case"); }
        setIsSaving(false);
    };

    const handleDeleteCase = async (id: string) => {
        if (!confirm("Excluir este case?")) return;
        await deleteCmsCase(id);
        loadCmsCases();
    };

    const handleSavePost = async () => {
        if (!editingPost || !editingPost.title) return alert("Título obrigatório");
        setIsSaving(true);
        try {
            await saveCmsPost(editingPost);
            setEditingPost(null);
            loadCmsPosts();
        } catch (e) { alert("Erro ao salvar artigo"); }
        setIsSaving(false);
    };

    const handleDeletePost = async (id: string) => {
        if (!confirm("Excluir este artigo?")) return;
        await deleteCmsPost(id);
        loadCmsPosts();
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string, isPost = false) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setIsUploading(true);
        const url = await uploadCmsFile(file, isPost && field === 'download_url' ? 'documentos' : 'fotoperfil');
        if (url) {
            if (isPost && editingPost) {
                setEditingPost({ ...editingPost, [field]: url });
            } else if (!isPost && editingCase) {
                setEditingCase({ ...editingCase, [field as keyof CmsCase]: url });
            }
        } else {
            alert("Erro no upload");
        }
        setIsUploading(false);
    };

    // ... (Existing Filters and Edit Logic) ...
    const handleQuickDashFilter = (days: number) => {
        const end = new Date();
        const start = new Date();
        if (days === 3650) { start.setFullYear(start.getFullYear() - 10); } 
        else if (days === 365) { start.setMonth(0, 1); } 
        else { start.setDate(end.getDate() - days); }
        setDashStart(start.toISOString().split('T')[0]);
        setDashEnd(end.toISOString().split('T')[0]);
    };

    const handleEdit = (user: AdminUser) => {
        setEditingUser(user);
        setUserName(user.nome || '');
        setOrgName(user.orgName || '');
        setOrgLimit(user.orgColaboradores || 1);
        setUserStatus(user.status || 'Ativo');
        setSelectedPlanId(user.currentPlanId || '');
        setStartDate(user.subscription_start || new Date().toISOString().split('T')[0]);
        if (user.subscription_end) { setEndDate(user.subscription_end); } 
        else {
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            setEndDate(nextMonth.toISOString().split('T')[0]);
        }
    };

    const handleSaveUser = async () => {
        if (!editingUser) return;
        if (selectedPlanId === '') return alert("Selecione um plano.");
        const plan = plans.find(p => p.id === Number(selectedPlanId));
        if (!plan) return;

        setIsSaving(true);
        const result = await updateGlobalClientData({
            userId: editingUser.id,
            orgId: editingUser.organizacao,
            userName: userName,
            orgName: orgName,
            orgLimit: orgLimit,
            userStatus: userStatus,
            planId: plan.id,
            start: startDate,
            end: endDate,
            value: plan.valor
        });

        if (result.success) {
            setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, nome: userName, orgName: orgName, orgColaboradores: orgLimit, status: userStatus, planName: plan.nome, currentPlanId: plan.id, subscription_start: startDate, subscription_end: endDate } : u));
            setEditingUser(null);
            alert("Dados atualizados!");
            refreshMetrics();
        } else {
            alert(`Erro: ${result.msg}`);
        }
        setIsSaving(false);
    };

    const handleStatusChange = async (userId: string, newStatus: string) => {
        const originalUsers = [...users];
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
        const result = await updateUserStatus(userId, newStatus);
        if (!result.success) {
            alert('Falha ao atualizar status.');
            setUsers(originalUsers);
        }
    };

    // Filter Logic
    const filteredUsers = users.filter(u => {
        const matchesSearch = u.nome.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()) || (u.orgName && u.orgName.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesPlan = filterPlan === 'all' || (u.planName && u.planName.includes(filterPlan));
        const matchesStatus = filterStatus === 'all' || u.status === filterStatus;
        let matchesDate = true;
        if (filterStart && u.subscription_start) matchesDate = matchesDate && u.subscription_start >= filterStart;
        if (filterEnd && u.subscription_start) matchesDate = matchesDate && u.subscription_start <= filterEnd;
        return matchesSearch && matchesPlan && matchesStatus && matchesDate;
    });

    const getStatusBadge = (status: string) => {
        const s = status || 'Pendente';
        if (s === 'Ativo' || s === 'Aprovado') return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
        if (s === 'Pendente') return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800';
        return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
    };

    const getPlanColor = (planName?: string) => {
        if (!planName) return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
        const name = planName.toLowerCase();
        if (name.includes('scale')) return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
        if (name.includes('studio')) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    };

    return (
        <div className="flex flex-col animate-in fade-in duration-500 h-full">
            
            {/* Header */}
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <Shield className="w-8 h-8 text-purple-600"/> Painel Gestor
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Super Admin: Gestão Total do Sistema.
                    </p>
                </div>

                {/* Tab Switcher */}
                <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 flex shadow-inner mt-4 md:mt-0 overflow-x-auto max-w-full">
                    <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                        <Activity className="w-3 h-3"/> Dash
                    </button>
                    <button onClick={() => setActiveTab('clients')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'clients' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                        <Users className="w-3 h-3"/> Clientes
                    </button>
                    <button onClick={() => setActiveTab('approvals')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'approvals' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                        <CheckCircle className="w-3 h-3"/> Aprovações {approvals.length > 0 && <span className="bg-red-500 text-white text-[9px] px-1 rounded-full">{approvals.length}</span>}
                    </button>
                    <button onClick={() => setActiveTab('cms_cases')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'cms_cases' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                        <Briefcase className="w-3 h-3"/> Cases
                    </button>
                    <button onClick={() => setActiveTab('cms_blog')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'cms_blog' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                        <FileText className="w-3 h-3"/> Blog
                    </button>
                </div>
            </div>

            {/* DASHBOARD TAB (Unchanged) */}
            {activeTab === 'dashboard' && metrics && (
                <div className="animate-in fade-in slide-in-from-left-4">
                    {/* Control Bar */}
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
                                <input type="date" value={dashStart} onChange={e => setDashStart(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 dark:text-white outline-none w-24"/>
                                <span className="text-slate-400">-</span>
                                <input type="date" value={dashEnd} onChange={e => setDashEnd(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 dark:text-white outline-none w-24"/>
                            </div>
                            {isRefreshingMetrics && <Loader2 className="w-4 h-4 animate-spin text-purple-500"/>}
                        </div>
                    </div>
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <div className="glass-panel p-5 rounded-2xl bg-white/50 dark:bg-slate-900/60 shadow-sm"><div className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-500"/> MRR Total</div><div className="text-2xl font-black text-slate-900 dark:text-white">R$ {metrics.totalMrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div></div>
                        <div className="glass-panel p-5 rounded-2xl bg-white/50 dark:bg-slate-900/60 shadow-sm"><div className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Users className="w-4 h-4 text-blue-500"/> Clientes Ativos</div><div className="text-2xl font-black text-slate-900 dark:text-white">{metrics.activeClients}</div></div>
                        <div className="glass-panel p-5 rounded-2xl bg-white/50 dark:bg-slate-900/60 shadow-sm"><div className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Activity className="w-4 h-4 text-purple-500"/> Ticket Médio</div><div className="text-2xl font-black text-slate-900 dark:text-white">R$ {metrics.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</div></div>
                        <div className="glass-panel p-5 rounded-2xl bg-white/50 dark:bg-slate-900/60 shadow-sm"><div className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Heart className="w-4 h-4 text-pink-500"/> NPS Score</div><div className="text-2xl font-black text-slate-900 dark:text-white">{metrics.npsScore}</div></div>
                    </div>
                </div>
            )}

            {/* CMS CASES TAB */}
            {activeTab === 'cms_cases' && (
                <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Gestão de Cases</h2>
                        <button onClick={() => setEditingCase({ title: '', category: 'Fintech', description: '', metric: '', image_url: '' })} className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-xs font-bold flex items-center gap-2">
                            <Plus className="w-3 h-3"/> Novo Case
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {cmsCases.map(c => (
                            <div key={c.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden group">
                                <div className="h-32 bg-slate-200 dark:bg-black relative">
                                    <img src={c.image_url} className="w-full h-full object-cover opacity-80"/>
                                    <div className="absolute top-2 right-2 flex gap-1">
                                        <button onClick={() => setEditingCase(c)} className="p-2 bg-white/90 rounded-full hover:text-blue-500"><Edit className="w-3 h-3"/></button>
                                        <button onClick={() => handleDeleteCase(c.id)} className="p-2 bg-white/90 rounded-full hover:text-red-500"><Trash2 className="w-3 h-3"/></button>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <span className="text-[10px] uppercase font-bold text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded">{c.category}</span>
                                    <h3 className="font-bold text-slate-900 dark:text-white mt-2">{c.title}</h3>
                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.description}</p>
                                    <div className="mt-3 flex items-center gap-2 text-xs font-bold text-emerald-500">
                                        <TrendingUp className="w-3 h-3"/> {c.metric}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* CMS BLOG TAB */}
            {activeTab === 'cms_blog' && (
                <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Blog & Materiais Ricos</h2>
                        <button onClick={() => setEditingPost({ title: '', content: '', published: false, tags: [] })} className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-xs font-bold flex items-center gap-2">
                            <Plus className="w-3 h-3"/> Novo Artigo
                        </button>
                    </div>
                    <div className="space-y-3">
                        {cmsPosts.map(p => (
                            <div key={p.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl hover:border-slate-300 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-slate-200 rounded-lg overflow-hidden shrink-0">
                                        {p.cover_image && <img src={p.cover_image} className="w-full h-full object-cover"/>}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">{p.title}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`w-2 h-2 rounded-full ${p.published ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                            <span className="text-xs text-slate-500">{p.published ? 'Publicado' : 'Rascunho'}</span>
                                            {p.download_url && <span className="text-[10px] bg-blue-500/10 text-blue-500 px-1.5 rounded flex items-center gap-1"><Download className="w-3 h-3"/> Material Rico</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setEditingPost(p)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded text-slate-500"><Edit className="w-4 h-4"/></button>
                                    <button onClick={() => handleDeletePost(p.id)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-500"><Trash2 className="w-4 h-4"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* CMS CASE MODAL */}
            {editingCase && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-white/10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Editar Case</h3>
                            <button onClick={() => setEditingCase(null)}><X className="w-5 h-5 text-slate-400"/></button>
                        </div>
                        <div className="space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <input type="text" placeholder="Título do Case" value={editingCase.title || ''} onChange={e => setEditingCase({...editingCase, title: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-black/20 rounded-xl text-sm outline-none"/>
                            <input type="text" placeholder="Categoria (Ex: Fintech)" value={editingCase.category || ''} onChange={e => setEditingCase({...editingCase, category: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-black/20 rounded-xl text-sm outline-none"/>
                            <textarea placeholder="Descrição" value={editingCase.description || ''} onChange={e => setEditingCase({...editingCase, description: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-black/20 rounded-xl text-sm outline-none h-24 resize-none"/>
                            <input type="text" placeholder="Métrica Principal (Ex: +200% ROI)" value={editingCase.metric || ''} onChange={e => setEditingCase({...editingCase, metric: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-black/20 rounded-xl text-sm outline-none font-bold text-emerald-500"/>
                            <input type="text" placeholder="Link Externo (Opcional)" value={editingCase.link_url || ''} onChange={e => setEditingCase({...editingCase, link_url: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-black/20 rounded-xl text-sm outline-none"/>
                            
                            <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 relative">
                                {isUploading ? <Loader2 className="w-6 h-6 animate-spin mx-auto"/> : (
                                    <>
                                        {editingCase.image_url ? <img src={editingCase.image_url} className="h-32 object-cover mx-auto rounded-lg"/> : <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-2"/>}
                                        <span className="text-xs text-slate-500 block">{editingCase.image_url ? 'Clique para trocar' : 'Upload Capa'}</span>
                                    </>
                                )}
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, 'image_url')} />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setEditingCase(null)} className="px-4 py-2 text-slate-500 font-bold text-xs">Cancelar</button>
                            <button onClick={handleSaveCase} disabled={isSaving} className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-xs shadow-lg">{isSaving ? 'Salvando...' : 'Salvar Case'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* CMS POST EDITOR (FULL PAGE) */}
            {editingPost && (
                <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-950 flex flex-col animate-in slide-in-from-bottom-10 duration-300">
                    <div className="w-full max-w-7xl mx-auto h-full flex flex-col p-6 md:p-8">
                        {/* Editor Header */}
                        <div className="flex justify-between items-center mb-8 shrink-0">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setEditingPost(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors">
                                    <ArrowLeft className="w-6 h-6 text-slate-500 dark:text-slate-400"/>
                                </button>
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Editor de Artigo</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm">Crie conteúdo rico para o blog.</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setEditingPost(null)} className="px-6 py-3 text-slate-500 font-bold text-sm hover:text-slate-900 dark:hover:text-white transition-colors">Cancelar</button>
                                <button onClick={handleSavePost} disabled={isSaving} className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm shadow-lg hover:scale-105 transition-transform flex items-center gap-2">
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                                    Salvar Artigo
                                </button>
                            </div>
                        </div>

                        {/* Editor Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 pr-4">
                            {/* Metadata Section */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 space-y-6">
                                    <input type="text" placeholder="Título do Artigo" value={editingPost.title || ''} onChange={e => setEditingPost({...editingPost, title: e.target.value})} className="w-full p-6 bg-slate-50 dark:bg-black/20 rounded-2xl text-3xl font-black outline-none border border-transparent focus:border-slate-200 dark:focus:border-white/10 transition-colors placeholder:text-slate-300 dark:placeholder:text-white/20"/>
                                    
                                    <div className="min-h-[500px]">
                                        <RichTextEditor 
                                            value={editingPost.content || ''} 
                                            onChange={(html) => setEditingPost({...editingPost, content: html})}
                                            placeholder="Comece a escrever seu artigo incrível aqui..."
                                            className="min-h-[500px]"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {/* Sidebar Settings */}
                                    <div className="bg-slate-50 dark:bg-black/20 p-6 rounded-2xl border border-slate-200 dark:border-white/5 space-y-6">
                                        
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-bold text-slate-500 uppercase">Capa</h4>
                                            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center cursor-pointer hover:bg-white dark:hover:bg-white/5 relative h-48 flex flex-col justify-center transition-colors overflow-hidden">
                                                {editingPost.cover_image ? <img src={editingPost.cover_image} className="h-full w-full object-cover absolute inset-0"/> : <div className="flex flex-col items-center gap-2 text-slate-400"><ImageIcon className="w-8 h-8"/><span className="text-xs">Upload Imagem</span></div>}
                                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, 'cover_image', true)} />
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <h4 className="text-xs font-bold text-slate-500 uppercase">Configurações</h4>
                                            <div className="space-y-2">
                                                <input type="text" placeholder="Tags (sep. vírgula)" value={editingPost.tags?.join(', ') || ''} onChange={e => setEditingPost({...editingPost, tags: e.target.value.split(',').map(t => t.trim())})} className="w-full p-3 bg-white dark:bg-black/20 rounded-xl text-sm outline-none border border-slate-200 dark:border-white/10"/>
                                                
                                                <label className="flex items-center gap-3 p-3 bg-white dark:bg-black/20 rounded-xl border border-slate-200 dark:border-white/10 cursor-pointer">
                                                    <input type="checkbox" checked={editingPost.published || false} onChange={e => setEditingPost({...editingPost, published: e.target.checked})} className="w-5 h-5 accent-emerald-500"/>
                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Publicado</span>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <h4 className="text-xs font-bold text-blue-500 uppercase flex items-center gap-2"><Download className="w-3 h-3"/> Material Rico</h4>
                                            <div className="space-y-2 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                                <input type="text" placeholder="Texto do Botão" value={editingPost.download_title || ''} onChange={e => setEditingPost({...editingPost, download_title: e.target.value})} className="w-full p-2 bg-white dark:bg-black/20 rounded-lg text-xs outline-none border border-blue-200 dark:border-blue-800"/>
                                                
                                                <div className="relative">
                                                    <button className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">
                                                        {editingPost.download_url ? 'Substituir PDF' : 'Upload PDF'}
                                                    </button>
                                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="application/pdf" onChange={(e) => handleFileUpload(e, 'download_url', true)} />
                                                </div>
                                                {editingPost.download_url && <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold text-center">Arquivo Anexado ✓</div>}
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Approvals and Clients tabs remain unchanged from original logic (just rendered if active) */}
            {/* ... Existing Approvals & Clients render code ... */}
            {activeTab === 'clients' && filteredUsers.length >= 0 && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    {/* User Table Code Here (Simplified for brevity as it was provided before) */}
                    {/* Reusing existing User Table logic */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                         <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="p-4 font-medium">Cliente</th>
                                    <th className="p-4 font-medium">Empresa</th>
                                    <th className="p-4 font-medium">Plano</th>
                                    <th className="p-4 font-medium">Status</th>
                                    <th className="p-4 font-medium text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredUsers.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="p-4"><span className="font-bold text-slate-900 dark:text-white">{user.nome}</span><br/><span className="text-xs text-slate-500">{user.email}</span></td>
                                        <td className="p-4">{user.orgName}</td>
                                        <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold border ${getPlanColor(user.planName)}`}>{user.planName}</span></td>
                                        <td className="p-4">
                                            <select value={user.status} onChange={(e) => handleStatusChange(user.id, e.target.value)} className={`appearance-none text-[10px] px-1.5 py-0.5 rounded font-bold uppercase border cursor-pointer ${getStatusBadge(user.status)}`}>
                                                <option value="Ativo" className="text-black">Ativo</option>
                                                <option value="Bloqueado" className="text-black">Bloqueado</option>
                                            </select>
                                        </td>
                                        <td className="p-4 text-right"><button onClick={() => handleEdit(user)} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:text-purple-600 rounded-lg text-xs font-bold">Editar</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {activeTab === 'approvals' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-right-4">
                    {approvals.map((trans) => (
                        <div key={trans.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-500/20 shadow-lg overflow-hidden relative group">
                            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-slate-400"/> {trans.orgName}
                                        </h4>
                                        <span className="text-xs text-slate-500">{new Date(trans.date).toLocaleDateString()}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">R$ {trans.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                        <span className="text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">Pendente</span>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    {trans.comprovante && <a href={trans.comprovante} target="_blank" className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2">Ver Comprovante</a>}
                                    <button onClick={() => handleApprove(String(trans.id), trans.organizationId)} disabled={approvingId === String(trans.id)} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-emerald-500">
                                        {approvingId === String(trans.id) ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4"/>} Aprovar
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* User Edit Modal */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="glass-panel w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-white/10">
                        <h3 className="font-bold text-lg mb-4 text-white">Editar Cliente</h3>
                        <div className="space-y-4">
                            <input value={userName} onChange={e => setUserName(e.target.value)} className="w-full p-3 bg-black/20 rounded-lg text-white text-sm" placeholder="Nome"/>
                            <input value={orgName} onChange={e => setOrgName(e.target.value)} className="w-full p-3 bg-black/20 rounded-lg text-white text-sm" placeholder="Empresa"/>
                            <div className="grid grid-cols-2 gap-4">
                                <input type="number" value={orgLimit} onChange={e => setOrgLimit(Number(e.target.value))} className="p-3 bg-black/20 rounded-lg text-white text-sm" placeholder="Users Limit"/>
                                <select value={selectedPlanId} onChange={e => setSelectedPlanId(Number(e.target.value))} className="p-3 bg-black/20 rounded-lg text-white text-sm cursor-pointer">
                                    {plans.map(p => <option key={p.id} value={p.id} className="text-black">{p.nome}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-3 bg-black/20 rounded-lg text-white text-sm"/>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-3 bg-black/20 rounded-lg text-white text-sm"/>
                            </div>
                            <div className="flex justify-end gap-3 mt-4">
                                <button onClick={() => setEditingUser(null)} className="px-4 py-2 text-slate-400 font-bold text-sm">Cancelar</button>
                                <button onClick={handleSaveUser} disabled={isSaving} className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-sm shadow-lg">{isSaving ? '...' : 'Salvar'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
