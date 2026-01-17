
import React, { useState, useEffect, useRef } from 'react';
import { fetchAllUsers, updateGlobalClientData, fetchPlans, fetchGlobalMetrics, AdminUser, GlobalMetrics, fetchPendingApprovals, approveSubscription, deleteAdminUser } from '../services/adminService';
import { fetchCmsCases, saveCmsCase, deleteCmsCase, fetchCmsPosts, saveCmsPost, deleteCmsPost, uploadCmsFile } from '../services/cmsService';
import { DbPlan, FinancialTransaction, CmsCase, CmsPost } from '../types';
import { Shield, Search, CreditCard, Loader2, Edit, CheckCircle, AlertTriangle, User, Zap, Building2, Users, DollarSign, TrendingUp, Activity, Filter, Calendar, Heart, UserMinus, Gem, MousePointer2, X, Clock, BarChart3, Wifi, Lock, ExternalLink, Check, Briefcase, FileText, ImageIcon, LinkIcon, Download, Save, Plus, Trash2, ArrowLeft, Globe, Tag, Eye, UploadCloud, ChevronRight, Settings, ArrowUpRight, SearchCode, BookOpen } from 'lucide-react';
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
        if (confirm("Deseja deletar este usuário permanentemente?")) {
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
            // Removemos metadados extras que podem causar erro de esquema
            const { keywords, ...payload } = editingPost as any;
            const result = await saveCmsPost(payload);
            if (result) {
                alert("Insight sincronizado com sucesso!");
                setEditingPost(null);
                loadData();
            }
        } catch (e: any) { 
            console.error("Save Post Failure:", e);
            alert(`Erro ao sincronizar insight: ${e.message || 'Falha de comunicação com o servidor'}`); 
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
                        </div>
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
                    
                    <div className="grid grid-cols-1 gap-4 pb-20">
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

            {/* CMS BLOG MODAL - REDESIGN FOCUSED ON FLOW */}
            {editingPost && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-3xl animate-in fade-in">
                    <div className="bg-[#0a0a0b] w-full max-w-6xl h-[95vh] rounded-[3rem] border border-white/10 overflow-hidden animate-ios-pop flex flex-col shadow-[0_0_120px_rgba(0,0,0,1)]">
                        
                        {/* Modal Header */}
                        <header className="px-10 py-6 border-b border-white/5 flex justify-between items-center bg-white/5 shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-black shadow-glow-amber">
                                    <BookOpen className="w-6 h-6 stroke-[2.5px]"/>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white tracking-tighter">{editingPost.id ? 'Editar Insight' : 'Novo Artigo Estratégico'}</h2>
                                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.3em]">Editor Shinkō CMS v2.6</p>
                                </div>
                            </div>
                            <button onClick={() => setEditingPost(null)} className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all text-slate-400 hover:text-white border border-white/5">
                                <X className="w-6 h-6"/>
                            </button>
                        </header>
                        
                        <div className="flex-1 flex overflow-hidden">
                            
                            {/* MAIN COLUMN (75%) */}
                            <div className="flex-1 p-10 overflow-y-auto custom-scrollbar space-y-12 bg-black/20">
                                
                                {/* Title & Slug Stack */}
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Título do Insight</label>
                                        <input 
                                            value={editingPost.title || ''} 
                                            onChange={e => setEditingPost({...editingPost, title: e.target.value, slug: editingPost.id ? editingPost.slug : generateSlug(e.target.value)})} 
                                            className="w-full bg-transparent text-4xl md:text-5xl font-black text-white outline-none placeholder:text-white/5 border-b border-white/10 focus:border-amber-500/50 pb-4 transition-all tracking-tighter"
                                            placeholder="Título Impactante..."
                                            autoFocus
                                        />
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Permalink</label>
                                        <div className="flex items-center gap-2 text-slate-400 font-mono text-xs bg-white/5 p-3 rounded-xl border border-white/5 group-focus-within:border-amber-500/30 transition-all">
                                            <span className="opacity-40">/blog/</span>
                                            <input 
                                                value={editingPost.slug || ''} 
                                                onChange={e => setEditingPost({...editingPost, slug: e.target.value})} 
                                                className="bg-transparent border-none outline-none flex-1 font-bold text-amber-500"
                                                placeholder="url-amigavel"
                                            />
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Content Area */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Corpo do Artigo</label>
                                    <RichTextEditor 
                                        value={editingPost.content || ''} 
                                        onChange={html => setEditingPost({...editingPost, content: html})} 
                                        placeholder="Comece a construir seu insight técnico aqui..." 
                                        className="min-h-[500px] rounded-3xl"
                                    />
                                </div>
                            </div>

                            {/* SIDEBAR (25%) */}
                            <aside className="w-[380px] border-l border-white/5 bg-black/40 p-10 overflow-y-auto custom-scrollbar space-y-12">
                                
                                {/* Image Upload Group */}
                                <section className="space-y-6">
                                    <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] flex items-center gap-3">
                                        <ImageIcon className="w-4 h-4"/> Atributos Visuais
                                    </h3>
                                    <div className="aspect-[16/9] bg-white/5 rounded-[2rem] border border-white/10 overflow-hidden relative group cursor-pointer hover:border-amber-500/30 transition-all shadow-inner">
                                        {editingPost.cover_image ? (
                                            <img src={editingPost.cover_image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="capa"/>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
                                                <UploadCloud className="w-8 h-8"/>
                                                <span className="text-[9px] font-black uppercase">Subir Capa</span>
                                            </div>
                                        )}
                                        <input type="file" id="post-cover" hidden onChange={e => handleFileUpload(e, 'cover_image', true)}/>
                                        <label htmlFor="post-cover" className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity z-10">
                                            <Edit className="w-6 h-6 text-white"/>
                                        </label>
                                    </div>
                                </section>

                                {/* SEO Section */}
                                <section className="space-y-6">
                                    <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] flex items-center gap-3">
                                        <SearchCode className="w-4 h-4"/> Otimização SEO
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">SEO Title (Browser)</label>
                                            <input 
                                                value={editingPost.seo_title || ''} 
                                                onChange={e => setEditingPost({...editingPost, seo_title: e.target.value})}
                                                placeholder="Título Google..."
                                                className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold outline-none focus:border-blue-500 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Meta Description</label>
                                            <textarea 
                                                value={editingPost.seo_description || ''} 
                                                onChange={e => setEditingPost({...editingPost, seo_description: e.target.value})}
                                                placeholder="Resumo para busca..."
                                                className="w-full h-28 p-4 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium outline-none focus:border-blue-500 transition-all resize-none"
                                            />
                                        </div>
                                    </div>
                                </section>

                                {/* Tags Group */}
                                <section className="space-y-6">
                                    <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] flex items-center gap-3">
                                        <Tag className="w-4 h-4"/> Taxonomia
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex flex-wrap gap-2">
                                            {editingPost.tags?.map(t => (
                                                <span key={t} className="px-3 py-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg text-[9px] font-black uppercase flex items-center gap-2">
                                                    {t} <button onClick={() => setEditingPost({...editingPost, tags: editingPost.tags?.filter(tag => tag !== t)})}><X className="w-3 h-3 hover:text-white transition-colors"/></button>
                                                </span>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <input 
                                                value={tagInput} 
                                                onChange={e => setTagInput(e.target.value)} 
                                                onKeyDown={e => e.key === 'Enter' && addTag()} 
                                                placeholder="Nova tag..." 
                                                className="flex-1 p-3 bg-white/5 border border-white/10 rounded-xl text-[10px] text-white outline-none focus:border-emerald-500"
                                            />
                                            <button onClick={addTag} className="px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-black text-slate-400 hover:text-white transition-all">ADD</button>
                                        </div>
                                    </div>
                                </section>

                                {/* Rich Material (Lead Gen) */}
                                <section className="space-y-6">
                                    <h3 className="text-[10px] font-black text-purple-500 uppercase tracking-[0.3em] flex items-center gap-3">
                                        <LinkIcon className="w-4 h-4"/> Material Rico
                                    </h3>
                                    <div className="space-y-4">
                                        <input 
                                            value={editingPost.download_title || ''} 
                                            onChange={e => setEditingPost({...editingPost, download_title: e.target.value})} 
                                            placeholder="Título do Botão (Ex: Baixar Guia)" 
                                            className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-bold outline-none focus:border-purple-500"
                                        />
                                        <input 
                                            value={editingPost.download_url || ''} 
                                            onChange={e => setEditingPost({...editingPost, download_url: e.target.value})} 
                                            placeholder="Link do PDF (URL)" 
                                            className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-mono outline-none focus:border-purple-500"
                                        />
                                    </div>
                                </section>

                            </aside>
                        </div>

                        {/* Modal Footer */}
                        <footer className="px-10 py-8 border-t border-white/5 bg-white/5 flex flex-col md:flex-row gap-6 justify-between items-center shrink-0">
                            <label className="flex items-center gap-4 cursor-pointer group">
                                <div className="relative">
                                    <input 
                                        type="checkbox" 
                                        checked={editingPost.published || false} 
                                        onChange={e => setEditingPost({...editingPost, published: e.target.checked})} 
                                        className="sr-only"
                                    />
                                    <div className={`w-12 h-6 rounded-full transition-all duration-300 border ${editingPost.published ? 'bg-emerald-500 border-emerald-400' : 'bg-white/5 border-white/20'}`}>
                                        <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all duration-300 shadow-md ${editingPost.published ? 'left-7' : 'left-1'}`}></div>
                                    </div>
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${editingPost.published ? 'text-emerald-500' : 'text-slate-500'}`}>Visibilidade Pública</span>
                            </label>
                            
                            <div className="flex gap-8 items-center">
                                <button onClick={() => setEditingPost(null)} className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 hover:text-red-500 transition-colors">Descartar</button>
                                <button 
                                    onClick={handleSavePost} 
                                    disabled={isSavingPost}
                                    className="px-16 py-5 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase rounded-[1.8rem] text-[11px] tracking-[0.2em] shadow-2xl shadow-amber-500/20 flex items-center justify-center gap-4 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                                >
                                    {isSavingPost ? <Loader2 className="animate-spin w-5 h-5"/> : <Save className="w-5 h-5"/>}
                                    {isSavingPost ? 'Sincronizando...' : 'Sincronizar Insight'}
                                </button>
                            </div>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
};
