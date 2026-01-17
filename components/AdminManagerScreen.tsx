
import React, { useState, useEffect, useRef } from 'react';
import { fetchAllUsers, updateGlobalClientData, fetchPlans, fetchGlobalMetrics, AdminUser, GlobalMetrics, fetchPendingApprovals, approveSubscription, deleteAdminUser } from '../services/adminService';
import { fetchCmsCases, saveCmsCase, deleteCmsCase, fetchCmsPosts, saveCmsPost, deleteCmsPost, uploadCmsFile } from '../services/cmsService';
import { DbPlan, FinancialTransaction, CmsCase, CmsPost } from '../types';
import { Shield, Search, CreditCard, Loader2, Edit, CheckCircle, AlertTriangle, User, Zap, Building2, Users, DollarSign, TrendingUp, Activity, Filter, Calendar, Heart, UserMinus, Gem, MousePointer2, X, Clock, BarChart3, Wifi, Lock, ExternalLink, Check, Briefcase, FileText, ImageIcon, LinkIcon, Download, Save, Plus, Trash2, ArrowLeft, Globe, Tag, Eye, UploadCloud, ChevronRight, Settings, ArrowUpRight, SearchCode } from 'lucide-react';
import { RichTextEditor } from './RichTextEditor';

interface Props {
    onlineUsers?: string[];
}

export const AdminManagerScreen: React.FC<Props> = ({ onlineUsers = [] }) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'clients' | 'approvals' | 'cms_cases' | 'cms_blog'>('dashboard');
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [plans, setPlans] = useState<DbPlan[]>([]);
    const [metrics, setMetrics] = useState<GlobalMetrics | null>(null);
    const [approvals, setApprovals] = useState<FinancialTransaction[]>([]);
    const [cmsCases, setCmsCases] = useState<CmsCase[]>([]);
    const [cmsPosts, setCmsPosts] = useState<CmsPost[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingPost, setIsSavingPost] = useState(false);
    const [approvingId, setApprovingId] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
    const [editingCase, setEditingCase] = useState<Partial<CmsCase> | null>(null);
    const [editingPost, setEditingPost] = useState<Partial<CmsPost> | null>(null);
    const [tagInput, setTagInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const [dashStart, setDashStart] = useState<string>(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
    const [dashEnd, setDashEnd] = useState<string>(new Date().toISOString().split('T')[0]);

    useEffect(() => { loadData(); }, [activeTab]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            if (activeTab === 'dashboard') {
                const [m, u] = await Promise.all([
                    fetchGlobalMetrics(dashStart, dashEnd),
                    fetchAllUsers()
                ]);
                setMetrics(m);
                setUsers(u);
            } else if (activeTab === 'clients') {
                const [u, p] = await Promise.all([fetchAllUsers(), fetchPlans()]);
                setUsers(u); 
                setPlans(p);
            } else if (activeTab === 'approvals') {
                const a = await fetchPendingApprovals();
                setApprovals(a);
            } else if (activeTab === 'cms_cases') {
                const c = await fetchCmsCases();
                setCmsCases(c);
            } else if (activeTab === 'cms_blog') {
                const p = await fetchCmsPosts(false);
                setCmsPosts(p);
            }
        } catch (e) {
            console.error("Admin Load Error:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteUser = async (e: React.MouseEvent, userId: string) => {
        e.stopPropagation();
        if (confirm("Deseja deletar este usuário permanentemente? Esta ação removerá o acesso mas não deletará os dados da organização vinculada.")) {
            setIsLoading(true);
            const success = await deleteAdminUser(userId);
            if (success) {
                alert("Usuário removido.");
                loadData();
            } else {
                alert("Falha ao deletar usuário.");
                setIsLoading(false);
            }
        }
    };

    const handleSaveUserChanges = async (updated: AdminUser) => {
        setIsLoading(true);
        try {
            const result = await updateGlobalClientData({
                userId: updated.id,
                orgId: updated.organizacao,
                userName: updated.nome,
                orgName: updated.orgName || '',
                orgLimit: updated.orgColaboradores || 1,
                userStatus: updated.status,
                userAtivo: updated.ativo,
                planId: updated.currentPlanId || 4,
                start: updated.subscription_start || '',
                end: updated.subscription_end || '',
                value: plans.find(p => p.id === updated.currentPlanId)?.valor || 0
            });
            if (result.success) {
                alert("Configurações mestres atualizadas!");
                setEditingUser(null);
                loadData();
            } else {
                alert("Erro: " + result.msg);
            }
        } catch (e) {
            alert("Erro fatal ao salvar.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveCase = async () => {
        if (!editingCase?.title) return alert("Título é obrigatório.");
        setIsLoading(true);
        try {
            await saveCmsCase(editingCase);
            setEditingCase(null);
            loadData();
        } catch (e) { alert("Erro ao salvar case."); } finally { setIsLoading(false); }
    };

    const handleSavePost = async () => {
        if (!editingPost?.title) return alert("Título é obrigatório.");
        if (!editingPost?.slug) return alert("Slug é obrigatório.");
        
        setIsSavingPost(true);
        try {
            const result = await saveCmsPost(editingPost);
            if (result) {
                alert("Insight sincronizado com sucesso!");
                setEditingPost(null);
                loadData();
            }
        } catch (e: any) { 
            console.error("Save Post Failure:", e);
            alert(`Erro ao sincronizar insight: ${e.message || 'Falha de conexão com o banco'}`); 
        } finally { 
            setIsSavingPost(false); 
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string, isPost = false) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsLoading(true);
        const url = await uploadCmsFile(file, 'fotoperfil');
        if (url) {
            if (isPost && editingPost) setEditingPost({ ...editingPost, [field]: url });
            else if (!isPost && editingCase) setEditingCase({ ...editingCase, [field as keyof CmsCase]: url });
        }
        setIsLoading(false);
    };

    const addTag = () => {
        if (!tagInput.trim() || !editingPost) return;
        const currentTags = editingPost.tags || [];
        if (!currentTags.includes(tagInput.trim())) setEditingPost({ ...editingPost, tags: [...currentTags, tagInput.trim()] });
        setTagInput('');
    };

    const formatDateForInput = (dateStr?: string | null) => {
        if (!dateStr) return '';
        return dateStr.split('T')[0];
    };

    const generateSlug = (text: string) => {
        return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/--+/g, '-').trim();
    };

    const getPlanBadgeStyle = (planName?: string) => {
        const name = planName?.toLowerCase() || '';
        if (name.includes('enterprise')) return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
        if (name.includes('scale')) return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        if (name.includes('studio')) return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
        if (name.includes('solo')) return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
        return 'bg-white/5 text-slate-400 border-white/10';
    };

    const KpiCard = ({ label, value, icon: Icon, color, subValue }: any) => (
        <div className="glass-card p-8 flex flex-col justify-between h-44 relative group overflow-hidden border-slate-200 dark:border-white/5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-current opacity-[0.03] rounded-full -mr-16 -mt-16 blur-3xl group-hover:opacity-[0.07] transition-opacity"></div>
            <div className="flex justify-between items-start relative z-10">
                <div className={`p-4 rounded-2xl ${color} bg-opacity-10 text-white dark:text-white border border-white/5 shadow-sm`}>
                    <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
                </div>
                <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</div>
            </div>
            <div className="relative z-10">
                <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-1">{value}</div>
                {subValue && <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{subValue}</div>}
            </div>
        </div>
    );

    const filteredUsers = users.filter(u => 
        u.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.orgName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col p-6 lg:p-10 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-[#020203]">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[9px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest mb-4">
                        <Shield className="w-3 h-3"/> Acesso Root Ativado
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                        Super <span className="text-amber-500">Admin</span>.
                    </h1>
                </div>

                <div className="flex bg-white dark:bg-white/5 p-1.5 rounded-[1.5rem] shadow-xl border border-slate-200 dark:border-white/10 backdrop-blur-3xl overflow-x-auto max-w-full no-scrollbar">
                    {[
                        { id: 'dashboard', label: 'Overview', icon: BarChart3 },
                        { id: 'clients', label: 'Contas', icon: Users },
                        { id: 'approvals', label: 'Aprovações', icon: CreditCard },
                        { id: 'cms_cases', label: 'Cases', icon: Briefcase },
                        { id: 'cms_blog', label: 'Blog', icon: FileText }
                    ].map((tab) => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-slate-900 dark:bg-white shadow-lg text-white dark:text-slate-900 scale-105' : 'text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                        >
                            <tab.icon className="w-4 h-4"/>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* DASHBOARD VIEW */}
            {!isLoading && activeTab === 'dashboard' && metrics && (
                <div className="space-y-10 animate-in fade-in duration-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <KpiCard label="MRR Consolidado" value={`R$ ${metrics.totalMrr.toLocaleString('pt-BR')}`} icon={DollarSign} color="bg-emerald-500" subValue="Receita Recorrente" />
                        <KpiCard label="Contas Ativas" value={metrics.activeClients} icon={Building2} color="bg-blue-500" subValue="Organizações Pagantes" />
                        <KpiCard label="Total de Usuários" value={metrics.totalUsers} icon={Users} color="bg-purple-500" subValue="Base Cadastrada" />
                        <KpiCard label="Ticket Médio" value={`R$ ${metrics.avgTicket.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`} icon={Zap} color="bg-amber-500" subValue="LTV Projetado" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 glass-panel p-8 rounded-[2.5rem] border-slate-200 dark:border-white/5 space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-amber-500"/> Logins Recentes
                                </h3>
                                <button onClick={() => setActiveTab('clients')} className="text-[10px] font-black uppercase text-amber-500 hover:underline">Ver Todos</button>
                            </div>
                            
                            <div className="overflow-x-auto no-scrollbar">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-white/5">
                                            <th className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Usuário</th>
                                            <th className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Plano</th>
                                            <th className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Acessos</th>
                                            <th className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Último Acesso</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {users.slice(0, 10).map(u => (
                                            <tr key={u.id} className="group hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setEditingUser(u)}>
                                                <td className="py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-xs text-slate-500 dark:text-white border border-slate-200 dark:border-white/10 group-hover:border-amber-500/30 transition-all">
                                                            {u.nome.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="text-[13px] font-black text-slate-900 dark:text-white leading-tight">{u.nome}</div>
                                                            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5 truncate max-w-[140px]">{u.orgName}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 text-center">
                                                    <span className={`px-2.5 py-1 rounded-[6px] text-[8px] font-black uppercase tracking-tighter border ${getPlanBadgeStyle(u.planName)}`}>
                                                        {u.planName}
                                                    </span>
                                                </td>
                                                <td className="py-4 text-center">
                                                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-black">{u.acessos}</span>
                                                </td>
                                                <td className="py-4 text-right">
                                                    <div className="text-[10px] font-black text-slate-900 dark:text-slate-300">
                                                        {u.ultimo_acesso ? new Date(u.ultimo_acesso).toLocaleDateString('pt-BR') : '---'}
                                                    </div>
                                                    <div className="text-[8px] text-slate-500 uppercase font-black tracking-widest mt-0.5">
                                                        {u.ultimo_acesso ? new Date(u.ultimo_acesso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'NUNCA'}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="glass-card p-8 rounded-[2.5rem] bg-gradient-to-br from-purple-500/5 to-transparent border-purple-500/10">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-purple-500"/> Engajamento
                                </h3>
                                <div className="space-y-6">
                                    <div>
                                        <div className="flex justify-between items-end mb-2">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Atividade (DAU/MAU)</span>
                                            <span className="text-xl font-black text-slate-900 dark:text-white">42%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full bg-purple-500 shadow-glow-purple" style={{ width: '42%' }}></div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                            <div className="text-2xl font-black text-white">{metrics.dau}</div>
                                            <div className="text-[8px] text-slate-500 uppercase font-bold">Ativos Hoje</div>
                                        </div>
                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                            <div className="text-2xl font-black text-white">{metrics.mau}</div>
                                            <div className="text-[8px] text-slate-500 uppercase font-bold">Ativos Mês</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="glass-card p-8 rounded-[2.5rem] bg-gradient-to-br from-emerald-500/5 to-transparent border-emerald-500/10">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                    <Heart className="w-4 h-4 text-emerald-500"/> Satisfação
                                </h3>
                                <div className="flex items-center gap-6">
                                    <div className="text-5xl font-black text-slate-900 dark:text-white">{metrics.npsScore}</div>
                                    <div>
                                        <div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">NPS Global</div>
                                        <div className="text-[8px] text-slate-500 font-bold uppercase mt-1 leading-tight">Baseado em feedback do sistema</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CLIENTS LIST */}
            {!isLoading && activeTab === 'clients' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white dark:bg-white/5 p-6 rounded-[2rem] border border-slate-200 dark:border-white/5">
                        <div className="flex items-center gap-6">
                            <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-500">
                                <Users className="w-8 h-8"/>
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{users.length} Usuários</h2>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Base de dados consolidada</p>
                            </div>
                        </div>
                        <div className="relative flex-1 max-w-md w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                            <input 
                                placeholder="Buscar usuário, email ou organização..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/10 rounded-2xl text-sm font-bold outline-none focus:border-amber-500 transition-all shadow-inner"
                            />
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        {filteredUsers.map(u => (
                            <div key={u.id} className="flex flex-col md:flex-row justify-between items-center p-6 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-3xl hover:border-amber-500/30 transition-all hover:shadow-2xl group cursor-pointer" onClick={() => setEditingUser({ ...u })}>
                                <div className="flex items-center gap-6 w-full md:w-auto">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center font-black text-2xl text-slate-500 dark:text-white group-hover:scale-110 transition-transform shadow-inner overflow-hidden border border-white/5">
                                        {u.nome.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <div className="font-black text-xl text-slate-900 dark:text-white leading-none">{u.nome}</div>
                                            <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${u.perfil === 'dono' ? 'bg-amber-500 text-black border border-amber-400' : u.perfil === 'cliente' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' : 'bg-slate-100 dark:bg-white/5 text-slate-500 border border-slate-200 dark:border-white/10'}`}>
                                                {u.perfil}
                                            </div>
                                            <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${u.ativo ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                                {u.ativo ? 'ATIVO' : 'INATIVO'}
                                            </div>
                                        </div>
                                        <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-2 flex flex-wrap gap-x-4 gap-y-1">
                                            <span className="flex items-center gap-1.5"><Building2 className="w-3 h-3"/> {u.orgName}</span>
                                            <span className={`flex items-center gap-1.5 font-black ${u.planName === 'Free' ? 'text-slate-400' : 'text-amber-500'}`}><Gem className="w-3 h-3"/> {u.planName}</span>
                                            <span className="flex items-center gap-1.5"><Users className="w-3 h-3"/> {u.orgColaboradores} {u.orgColaboradores === 1 ? 'usuário' : 'usuários'}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-6 mt-6 md:mt-0 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 dark:border-white/5">
                                    <div className="text-right">
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Último Acesso</div>
                                        <div className="text-xs font-bold text-slate-900 dark:text-white mt-1">{u.ultimo_acesso ? new Date(u.ultimo_acesso).toLocaleDateString() : 'Nunca'}</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setEditingUser({ ...u }); }} 
                                            className="p-3 bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all"
                                        >
                                            <Settings className="w-4 h-4"/>
                                        </button>
                                        <button 
                                            onClick={(e) => handleDeleteUser(e, u.id)}
                                            className="p-3 bg-red-500/5 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                                        >
                                            <Trash2 className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* APROVALS VIEW */}
            {!isLoading && activeTab === 'approvals' && (
                <div className="animate-in fade-in duration-500 space-y-6">
                    {approvals.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-center opacity-50">
                            <CheckCircle className="w-16 h-16 text-slate-300 mb-4"/>
                            <h3 className="text-xl font-black text-slate-400">Tudo em dia!</h3>
                            <p className="text-sm font-bold">Nenhuma assinatura aguardando aprovação.</p>
                        </div>
                    ) : (
                        approvals.map(app => (
                            <div key={app.id} className="glass-panel p-8 rounded-[2.5rem] border-slate-200 dark:border-white/10 flex flex-col md:flex-row justify-between items-center gap-8 group">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                                        <CreditCard className="w-8 h-8"/>
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{app.orgName}</h3>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">{app.description} • <span className="text-emerald-500 font-black">R$ {app.amount.toLocaleString('pt-BR')}</span></p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    <a href={app.comprovante} target="_blank" className="flex-1 md:flex-none px-6 py-4 bg-slate-100 dark:bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                        <ImageIcon className="w-4 h-4"/> Ver Comprovante
                                    </a>
                                    <button 
                                        onClick={async () => {
                                            if(confirm("Confirmar recebimento e liberar módulos?")) {
                                                setApprovingId(app.id);
                                                const res = await approveSubscription(app.id, app.organizationId);
                                                if(res.success) { alert("Assinatura liberada!"); loadData(); }
                                                else alert(res.msg);
                                                setApprovingId(null);
                                            }
                                        }}
                                        disabled={approvingId === app.id}
                                        className="flex-[2] md:flex-none px-10 py-4 bg-emerald-500 text-black rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-glow-emerald flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {approvingId === app.id ? <Loader2 className="animate-spin w-4 h-4"/> : <Check className="w-4 h-4"/>}
                                        Aprovar Agora
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* CMS CASES VIEW */}
            {!isLoading && activeTab === 'cms_cases' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <button 
                        onClick={() => setEditingCase({ title: '', category: 'SaaS', description: '', metric: '', image_url: '' })}
                        className="w-full py-8 border-2 border-dashed border-slate-300 dark:border-white/10 rounded-[2.5rem] text-slate-400 font-black uppercase tracking-[0.3em] hover:border-amber-500/50 hover:bg-amber-500/5 transition-all flex items-center justify-center gap-4 group"
                    >
                        <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-500"/> Adicionar Novo Case
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {cmsCases.map(c => (
                            <div key={c.id} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-[2rem] overflow-hidden group hover:border-amber-500/30 transition-all flex flex-col">
                                <div className="h-48 overflow-hidden bg-slate-100 dark:bg-black/40 relative">
                                    {c.image_url ? (
                                        <img src={c.image_url} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" alt={c.title}/>
                                    ) : (
                                        <div className="flex items-center justify-center h-full"><ImageIcon className="w-12 h-12 text-slate-300"/></div>
                                    )}
                                    <div className="absolute top-4 left-4 px-3 py-1 bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest rounded-full">{c.category}</div>
                                </div>
                                <div className="p-6 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{c.title}</h3>
                                        <div className="text-emerald-500 font-black text-xs">{c.metric}</div>
                                    </div>
                                    <p className="text-slate-500 text-sm line-clamp-2 mb-6">{c.description}</p>
                                    <div className="mt-auto pt-4 border-t border-slate-100 dark:border-white/5 flex justify-end gap-2">
                                        <button onClick={() => setEditingCase(c)} className="p-2.5 bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all"><Edit className="w-4 h-4"/></button>
                                        <button onClick={async () => { if(confirm("Excluir case?")) { await deleteCmsCase(c.id); loadData(); } }} className="p-2.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"><Trash2 className="w-4 h-4"/></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* CMS BLOG VIEW */}
            {!isLoading && activeTab === 'cms_blog' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <button 
                        onClick={() => setEditingPost({ title: '', content: '', tags: [], published: false, slug: '' })} 
                        className="w-full py-8 border-2 border-dashed border-slate-300 dark:border-white/10 rounded-[2.5rem] text-slate-400 font-black uppercase tracking-[0.3em] hover:border-amber-500/50 hover:bg-amber-500/5 transition-all flex items-center justify-center gap-4 group"
                    >
                        <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-500"/> Publicar Novo Insight
                    </button>
                    
                    <div className="grid grid-cols-1 gap-4">
                        {cmsPosts.map(p => (
                            <div key={p.id} className="p-6 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-3xl flex items-center justify-between group hover:border-amber-500/30 transition-all">
                                <div className="flex items-center gap-6">
                                    <div className="w-20 h-14 rounded-xl bg-slate-100 dark:bg-black/40 overflow-hidden border border-white/5">
                                        {p.cover_image && <img src={p.cover_image} className="w-full h-full object-cover" alt={p.title}/>}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">{p.title}</h3>
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className={`px-2 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-widest ${p.published ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-500/10 text-slate-500'}`}>{p.published ? 'Publicado' : 'Rascunho'}</span>
                                            <span className="text-[10px] text-slate-500 font-mono">/blog/{p.slug}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setEditingPost(p)} className="p-3 bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-2xl transition-all"><Edit className="w-5 h-5"/></button>
                                    <button onClick={async () => { if(confirm("Excluir post?")) { await deleteCmsPost(p.id); loadData(); } }} className="p-3 bg-red-500/5 text-red-400 hover:bg-red-500 hover:text-white rounded-2xl transition-all"><Trash2 className="w-5 h-5"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* MASTER CONTROL MODAL (EDIT USER) */}
            {editingUser && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in">
                    <div className="bg-[#0c0c0e] w-full max-w-2xl rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/10 overflow-hidden animate-ios-pop flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-white/5 flex justify-between items-start bg-white/5">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-amber-500/20">{editingUser.nome.charAt(0)}</div>
                                <div>
                                    <h2 className="text-2xl font-black text-white leading-none">Controle Mestre</h2>
                                    <p className="text-[10px] text-amber-500 font-black uppercase tracking-[0.2em] mt-2">ORG: {editingUser.orgName}</p>
                                </div>
                            </div>
                            <button onClick={() => setEditingUser(null)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all"><X className="w-6 h-6"/></button>
                        </div>
                        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar space-y-8">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-5 bg-black/40 rounded-2xl border border-white/5 group hover:border-amber-500/30 transition-colors">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Total de Logins</span>
                                    <span className="text-2xl font-black text-white group-hover:text-amber-500 transition-colors">{editingUser.acessos || 0} acessos</span>
                                </div>
                                <div className="p-5 bg-black/40 rounded-2xl border border-white/5 group hover:border-emerald-500/30 transition-colors">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Status de Conexão</span>
                                    <span className={`text-2xl font-black flex items-center gap-3 ${onlineUsers.includes(editingUser.id) ? 'text-emerald-500' : 'text-slate-500'}`}>
                                        <div className={`w-3 h-3 rounded-full ${onlineUsers.includes(editingUser.id) ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></div>
                                        {onlineUsers.includes(editingUser.id) ? 'Online Agora' : 'Offline'}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] border-b border-white/5 pb-3">Configurações da Conta</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Status de Acesso</label>
                                        <select value={editingUser.status} onChange={e => setEditingUser({...editingUser, status: e.target.value})} className={`w-full p-4 rounded-xl text-sm font-bold bg-black/40 border border-white/10 focus:border-amber-500 outline-none transition-all ${editingUser.status === 'Ativo' ? 'text-emerald-500' : 'text-red-500'}`}>
                                            <option value="Ativo" className="bg-[#0c0c0e]">Liberado / Ativo</option>
                                            <option value="Bloqueado" className="bg-[#0c0c0e]">Bloqueado / Suspenso</option>
                                            <option value="Pendente" className="bg-[#0c0c0e]">Aguardando Pagamento</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Plano Core</label>
                                        <select value={editingUser.currentPlanId} onChange={e => setEditingUser({...editingUser, currentPlanId: parseInt(e.target.value)})} className="w-full p-4 rounded-xl text-sm font-bold bg-black/40 border border-white/10 focus:border-amber-500 text-white outline-none">
                                            {plans.map(p => <option key={p.id} value={p.id} className="bg-[#0c0c0e]">{p.nome} - R$ {p.valor.toLocaleString()}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-4 bg-black/40 border border-white/10 rounded-2xl">
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Usuário Ativo</label>
                                        <p className="text-[10px] text-slate-500">Define se o usuário pode logar.</p>
                                    </div>
                                    <input type="checkbox" checked={editingUser.ativo} onChange={e => setEditingUser({...editingUser, ativo: e.target.checked})} className="w-6 h-6 rounded bg-slate-900 border-white/10 text-amber-500 focus:ring-amber-500" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Início do Ciclo</label>
                                        <input type="date" value={formatDateForInput(editingUser.subscription_start)} onChange={e => setEditingUser({...editingUser, subscription_start: e.target.value})} className="w-full p-4 rounded-xl text-sm font-bold bg-black/40 border border-white/10 text-white outline-none focus:border-amber-500"/>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Data de Expiração</label>
                                        <input type="date" value={formatDateForInput(editingUser.subscription_end)} onChange={e => setEditingUser({...editingUser, subscription_end: e.target.value})} className="w-full p-4 rounded-xl text-sm font-bold bg-black/40 border border-white/10 text-white outline-none focus:border-amber-500"/>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-8 border-t border-white/5 bg-white/5 flex gap-4 shrink-0">
                            <button onClick={() => setEditingUser(null)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white">Cancelar</button>
                            <button onClick={() => handleSaveUserChanges(editingUser)} className="flex-[2] py-4 bg-amber-500 hover:bg-amber-400 text-black rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3">
                                <Save className="w-4 h-4"/> Aplicar Configurações
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CMS CASE MODAL */}
            {editingCase && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in">
                    <div className="bg-[#0c0c0e] w-full max-w-2xl rounded-[2.5rem] border border-white/10 overflow-hidden animate-ios-pop flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <h2 className="text-2xl font-black text-white">{editingCase.id ? 'Editar Case' : 'Novo Case'}</h2>
                            <button onClick={() => setEditingCase(null)} className="p-2 text-slate-400 hover:text-white"><X className="w-6 h-6"/></button>
                        </div>
                        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Título do Projeto</label>
                                    <input value={editingCase.title || ''} onChange={e => setEditingCase({...editingCase, title: e.target.value})} className="w-full p-4 rounded-xl bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-amber-500"/>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Categoria</label>
                                    <select value={editingCase.category || 'SaaS'} onChange={e => setEditingCase({...editingCase, category: e.target.value})} className="w-full p-4 rounded-xl bg-black/40 border border-white/10 text-white text-sm outline-none">
                                        <option value="SaaS">SaaS / Plataforma</option>
                                        <option value="Mobile">Mobile App</option>
                                        <option value="Automacao">Automação IA</option>
                                        <option value="Enterprise">Enterprise</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Métrica de Sucesso (ex: +30% ROI)</label>
                                <input value={editingCase.metric || ''} onChange={e => setEditingCase({...editingCase, metric: e.target.value})} className="w-full p-4 rounded-xl bg-black/40 border border-white/10 text-emerald-500 text-sm outline-none focus:border-emerald-500"/>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Resumo do Case</label>
                                <textarea value={editingCase.description || ''} onChange={e => setEditingCase({...editingCase, description: e.target.value})} className="w-full h-32 p-4 rounded-xl bg-black/40 border border-white/10 text-white text-sm outline-none resize-none focus:border-amber-500"/>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Imagem de Capa</label>
                                <div className="flex gap-4 items-center">
                                    <div className="w-24 h-16 rounded-xl bg-black/40 border border-white/5 overflow-hidden flex items-center justify-center">
                                        {editingCase.image_url ? <img src={editingCase.image_url} className="w-full h-full object-cover" alt="preview"/> : <ImageIcon className="w-6 h-6 text-slate-600"/>}
                                    </div>
                                    <input type="file" id="case-upload" hidden onChange={e => handleFileUpload(e, 'image_url', false)}/>
                                    <label htmlFor="case-upload" className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold cursor-pointer hover:bg-white/10 transition-all flex items-center gap-2">
                                        <UploadCloud className="w-4 h-4"/> Subir Imagem
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="p-8 border-t border-white/5 bg-white/5 flex gap-4">
                            <button onClick={() => setEditingCase(null)} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-500">Cancelar</button>
                            <button onClick={handleSaveCase} className="flex-[2] py-4 bg-amber-500 text-black font-black uppercase rounded-2xl text-[11px] shadow-xl flex items-center justify-center gap-2">
                                <CheckCircle className="w-4 h-4"/> Salvar Case
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CMS BLOG MODAL */}
            {editingPost && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in">
                    <div className="bg-[#0c0c0e] w-full max-w-5xl h-[90vh] rounded-[2.5rem] border border-white/10 overflow-hidden animate-ios-pop flex flex-col">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <h2 className="text-2xl font-black text-white">{editingPost.id ? 'Editar Insight' : 'Novo Insight'}</h2>
                            <button onClick={() => setEditingPost(null)} className="p-2 text-slate-400 hover:text-white transition-all"><X className="w-6 h-6"/></button>
                        </div>
                        
                        <div className="flex-1 flex overflow-hidden">
                            {/* Editor Principal */}
                            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar space-y-8 border-r border-white/5">
                                <div className="flex flex-col gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Título do Post</label>
                                        <input 
                                            value={editingPost.title || ''} 
                                            onChange={e => setEditingPost({...editingPost, title: e.target.value, slug: editingPost.id ? editingPost.slug : generateSlug(e.target.value)})} 
                                            className="w-full p-4 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-bold outline-none focus:border-amber-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Slug (URL Amigável)</label>
                                        <input value={editingPost.slug || ''} onChange={e => setEditingPost({...editingPost, slug: e.target.value})} className="w-full p-4 rounded-xl bg-black/40 border border-white/10 text-slate-400 text-sm outline-none focus:border-amber-500 font-mono"/>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Conteúdo do Artigo</label>
                                    <RichTextEditor value={editingPost.content || ''} onChange={html => setEditingPost({...editingPost, content: html})} placeholder="Escreva seu insight técnico aqui..." />
                                </div>

                                <div className="space-y-4">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Material Rico (Download)</label>
                                    <div className="flex flex-col gap-4">
                                        <input value={editingPost.download_title || ''} onChange={e => setEditingPost({...editingPost, download_title: e.target.value})} placeholder="Título do Botão (ex: Baixar Guia)" className="w-full p-4 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none"/>
                                        <input value={editingPost.download_url || ''} onChange={e => setEditingPost({...editingPost, download_url: e.target.value})} placeholder="Link do PDF/Arquivo" className="w-full p-4 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none"/>
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar de Configurações e SEO */}
                            <aside className="w-80 bg-black/20 p-8 overflow-y-auto custom-scrollbar space-y-10">
                                <div>
                                    <label className="block text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                        <SearchCode className="w-3.5 h-3.5"/> SEO & Social Engine
                                    </label>
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Meta Title (Google)</label>
                                            <input 
                                                value={editingPost.seo_title || ''} 
                                                onChange={e => setEditingPost({...editingPost, seo_title: e.target.value})}
                                                placeholder="Título otimizado..."
                                                className="w-full p-3 rounded-lg bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-amber-500"
                                            />
                                            <span className="text-[8px] text-slate-600 mt-1 block">Ideal: 60 caracteres</span>
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Meta Description</label>
                                            <textarea 
                                                value={editingPost.seo_description || ''} 
                                                onChange={e => setEditingPost({...editingPost, seo_description: e.target.value})}
                                                placeholder="Resumo para busca..."
                                                className="w-full h-24 p-3 rounded-lg bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-amber-500 resize-none"
                                            />
                                            <span className="text-[8px] text-slate-600 mt-1 block">Ideal: 160 caracteres</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Atributos Visuais</label>
                                    <div className="space-y-6">
                                        <div className="aspect-video bg-black rounded-xl border border-white/5 overflow-hidden flex items-center justify-center relative group">
                                            {editingPost.cover_image ? <img src={editingPost.cover_image} className="w-full h-full object-cover" alt="capa"/> : <ImageIcon className="w-6 h-6 text-slate-700"/>}
                                            <input type="file" id="post-upload-side" hidden onChange={e => handleFileUpload(e, 'cover_image', true)}/>
                                            <label htmlFor="post-upload-side" className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                                <UploadCloud className="w-6 h-6 text-white"/>
                                            </label>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Tags do Artigo</label>
                                            <div className="flex flex-wrap gap-1.5 mb-3">
                                                {editingPost.tags?.map(t => (
                                                    <span key={t} className="px-2 py-0.5 bg-white/5 text-slate-300 border border-white/10 rounded-md text-[8px] font-black flex items-center gap-1.5">
                                                        {t} <button onClick={() => setEditingPost({...editingPost, tags: editingPost.tags?.filter(tag => tag !== t)})}><X className="w-2.5 h-2.5"/></button>
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="flex gap-1.5">
                                                <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} placeholder="Nova tag..." className="flex-1 p-2 bg-black/40 border border-white/10 rounded-lg text-[10px] text-white outline-none"/>
                                                <button onClick={addTag} className="px-3 py-2 bg-white/5 rounded-lg border border-white/10 text-[10px] font-bold">ADD</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </aside>
                        </div>

                        <div className="p-8 border-t border-white/5 bg-white/5 flex gap-4">
                            <label className="flex items-center gap-3 cursor-pointer mr-auto">
                                <input type="checkbox" checked={editingPost.published || false} onChange={e => setEditingPost({...editingPost, published: e.target.checked})} className="w-5 h-5 rounded bg-black border-white/10 text-amber-500"/>
                                <span className="text-xs font-bold text-slate-400 uppercase">Publicar Insight</span>
                            </label>
                            <button onClick={() => setEditingPost(null)} className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">Cancelar</button>
                            <button 
                                onClick={handleSavePost} 
                                disabled={isSavingPost}
                                className="px-12 py-4 bg-amber-500 text-black font-black uppercase rounded-2xl text-[11px] shadow-xl flex items-center justify-center gap-2 hover:bg-amber-400 transition-all disabled:opacity-50"
                            >
                                {isSavingPost ? <Loader2 className="animate-spin w-4 h-4"/> : <Save className="w-4 h-4"/>}
                                {isSavingPost ? 'Sincronizando...' : 'Sincronizar Insight'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
