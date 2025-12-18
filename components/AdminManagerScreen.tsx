
import React, { useState, useEffect, useRef } from 'react';
import { fetchAllOwners, updateGlobalClientData, fetchPlans, fetchGlobalMetrics, AdminUser, GlobalMetrics, updateUserStatus, fetchPendingApprovals, approveSubscription } from '../services/adminService';
import { fetchCmsCases, saveCmsCase, deleteCmsCase, fetchCmsPosts, saveCmsPost, deleteCmsPost, uploadCmsFile } from '../services/cmsService';
import { DbPlan, FinancialTransaction, CmsCase, CmsPost } from '../types';
import { Shield, Search, CreditCard, Loader2, Edit, CheckCircle, AlertTriangle, User, Zap, Building2, Users, DollarSign, TrendingUp, Activity, Filter, Calendar, Heart, UserMinus, Gem, MousePointer2, X, Clock, BarChart3, Wifi, Lock, ExternalLink, Check, Briefcase, FileText, Image as ImageIcon, Link as LinkIcon, Download, Save, Plus, Trash2, ArrowLeft, Globe, Tag, Eye, UploadCloud, ChevronRight, Settings } from 'lucide-react';
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
    const [approvingId, setApprovingId] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
    const [editingCase, setEditingCase] = useState<Partial<CmsCase> | null>(null);
    const [editingPost, setEditingPost] = useState<Partial<CmsPost> | null>(null);
    const [tagInput, setTagInput] = useState('');

    const [dashStart, setDashStart] = useState<string>(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
    const [dashEnd, setDashEnd] = useState<string>(new Date().toISOString().split('T')[0]);

    useEffect(() => { loadData(); }, [activeTab]);

    const loadData = async () => {
        setIsLoading(true);
        if (activeTab === 'dashboard') {
            const m = await fetchGlobalMetrics(dashStart, dashEnd);
            setMetrics(m);
        } else if (activeTab === 'clients') {
            const [u, p] = await Promise.all([fetchAllOwners(), fetchPlans()]);
            setUsers(u); setPlans(p);
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
        setIsLoading(false);
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
        setIsLoading(true);
        try {
            await saveCmsPost(editingPost);
            setEditingPost(null);
            loadData();
        } catch (e) { alert("Erro ao salvar post."); } finally { setIsLoading(false); }
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

    return (
        <div className="h-full flex flex-col p-6 overflow-y-auto custom-scrollbar">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <Shield className="w-8 h-8 text-amber-500"/> Painel Super Admin
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-[0.2em] mt-2">Controle de Ecossistema Shinkō</p>
                </div>
                <div className="flex bg-white dark:bg-white/5 p-1 rounded-2xl shadow-xl border border-slate-200 dark:border-white/10 backdrop-blur-md overflow-x-auto max-w-full">
                    {[
                        { id: 'dashboard', label: 'Overview', icon: BarChart3 },
                        { id: 'clients', label: 'Clientes', icon: Users },
                        { id: 'approvals', label: 'Aprovações', icon: CreditCard },
                        { id: 'cms_cases', label: 'Cases', icon: Briefcase },
                        { id: 'cms_blog', label: 'Blog', icon: FileText }
                    ].map((tab) => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-slate-900 dark:bg-white shadow-lg text-white dark:text-slate-900 scale-105' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                        >
                            <tab.icon className="w-3.5 h-3.5"/>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading && !editingUser && !editingCase && !editingPost && (
                <div className="flex flex-col items-center justify-center py-40 gap-4">
                    <Loader2 className="w-12 h-12 animate-spin text-amber-500"/>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Sincronizando Ecossistema...</span>
                </div>
            )}

            {/* DASHBOARD VIEW */}
            {!isLoading && activeTab === 'dashboard' && metrics && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in duration-700">
                    <div className="glass-card-kpi p-8 rounded-[2rem] border border-slate-200 dark:border-white/5 flex flex-col justify-between h-44 relative group overflow-hidden">
                        <div className="relative z-10">
                            <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                <DollarSign className="w-3 h-3 text-emerald-500"/> MRR Estimado
                            </div>
                            <div className="text-4xl font-black text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                                R$ {metrics.totalMrr.toLocaleString('pt-BR')}
                            </div>
                        </div>
                        <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <TrendingUp className="w-32 h-32 text-white" />
                        </div>
                    </div>
                    {/* Outros KPIs... */}
                </div>
            )}

            {/* CLIENTS LIST */}
            {!isLoading && activeTab === 'clients' && (
                <div className="space-y-4 animate-in fade-in duration-500">
                    {users.map(u => (
                        <div key={u.id} className="flex flex-col md:flex-row justify-between items-center p-6 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-3xl hover:border-amber-500/30 transition-all hover:shadow-2xl hover:shadow-black/20 group">
                            <div className="flex items-center gap-6 w-full md:w-auto">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center font-black text-2xl text-slate-500 dark:text-white group-hover:scale-110 transition-transform shadow-inner">
                                    {u.nome.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <div className="font-black text-xl text-slate-900 dark:text-white leading-none">{u.nome}</div>
                                        <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${u.status === 'Ativo' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                            {u.status}
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-2 flex flex-wrap gap-x-4 gap-y-1">
                                        <span className="flex items-center gap-1.5"><Building2 className="w-3 h-3"/> {u.orgName}</span>
                                        <span className="flex items-center gap-1.5 text-amber-500"><Gem className="w-3 h-3"/> {u.planName}</span>
                                        <span className="flex items-center gap-1.5"><Users className="w-3 h-3"/> {u.orgColaboradores} usuários</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-8 mt-6 md:mt-0 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 dark:border-white/5">
                                <button 
                                    onClick={() => setEditingUser({ ...u })} 
                                    className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-105 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center gap-2"
                                >
                                    <Settings className="w-4 h-4"/> Gerenciar
                                </button>
                            </div>
                        </div>
                    ))}
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

            {/* CMS BLOG VIEW - RESTAURADO AO MODELO MARAVILHOSO */}
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
                                            <span className={`px-2 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-widest ${p.published ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'}`}>{p.published ? 'Publicado' : 'Rascunho'}</span>
                                            <span className="text-[10px] text-slate-500 font-mono">/blog/{p.slug}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setEditingPost(p)} className="p-3 bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-2xl transition-all"><Edit className="w-5 h-5"/></button>
                                    <button onClick={async () => { if(confirm("Excluir post?")) { await deleteCmsPost(p.id); loadData(); } }} className="p-3 bg-red-500/5 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all"><Trash2 className="w-5 h-5"/></button>
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

            {/* CMS BLOG MODAL - RESTAURADO AO MODELO MARAVILHOSO */}
            {editingPost && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in">
                    <div className="bg-[#0c0c0e] w-full max-w-4xl h-[90vh] rounded-[2.5rem] border border-white/10 overflow-hidden animate-ios-pop flex flex-col">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <h2 className="text-2xl font-black text-white">{editingPost.id ? 'Editar Insight' : 'Novo Insight'}</h2>
                            <button onClick={() => setEditingPost(null)} className="p-2 text-slate-400 hover:text-white transition-all"><X className="w-6 h-6"/></button>
                        </div>
                        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Título do Post</label>
                                    <input 
                                        value={editingPost.title || ''} 
                                        onChange={e => setEditingPost({...editingPost, title: e.target.value, slug: editingPost.id ? editingPost.slug : generateSlug(e.target.value)})} 
                                        className="w-full p-4 rounded-xl bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-amber-500 font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Slug (URL Amigável)</label>
                                    <input value={editingPost.slug || ''} onChange={e => setEditingPost({...editingPost, slug: e.target.value})} className="w-full p-4 rounded-xl bg-black/40 border border-white/10 text-slate-400 text-sm outline-none focus:border-amber-500 font-mono"/>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tags</label>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {editingPost.tags?.map(t => (
                                        <span key={t} className="px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-lg text-[10px] font-black flex items-center gap-2">
                                            {t} <button onClick={() => setEditingPost({...editingPost, tags: editingPost.tags?.filter(tag => tag !== t)})}><X className="w-3 h-3"/></button>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} placeholder="Adicionar tag..." className="flex-1 p-3 bg-black/40 border border-white/10 rounded-xl text-sm text-white outline-none"/>
                                    <button onClick={addTag} className="px-4 py-3 bg-white/5 rounded-xl border border-white/10 text-xs font-bold">Add</button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Conteúdo do Artigo</label>
                                <RichTextEditor value={editingPost.content || ''} onChange={html => setEditingPost({...editingPost, content: html})} placeholder="Escreva seu insight técnico aqui..." />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-4">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Material Rico (Download)</label>
                                    <input value={editingPost.download_title || ''} onChange={e => setEditingPost({...editingPost, download_title: e.target.value})} placeholder="Título do Botão (ex: Baixar Guia)" className="w-full p-4 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none"/>
                                    <input value={editingPost.download_url || ''} onChange={e => setEditingPost({...editingPost, download_url: e.target.value})} placeholder="Link do PDF/Arquivo" className="w-full p-4 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none"/>
                                </div>
                                <div className="space-y-4">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Imagem de Capa</label>
                                    <div className="flex gap-4">
                                        <div className="w-32 h-20 bg-black rounded-xl border border-white/5 overflow-hidden flex items-center justify-center">
                                            {editingPost.cover_image ? <img src={editingPost.cover_image} className="w-full h-full object-cover" alt="capa"/> : <ImageIcon className="w-6 h-6 text-slate-700"/>}
                                        </div>
                                        <input type="file" id="post-upload" hidden onChange={e => handleFileUpload(e, 'cover_image', true)}/>
                                        <label htmlFor="post-upload" className="h-20 flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl hover:border-amber-500/50 cursor-pointer text-slate-500 hover:text-amber-500 transition-all">
                                            <UploadCloud className="w-5 h-5 mb-1"/>
                                            <span className="text-[10px] font-bold uppercase">Mudar Capa</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-8 border-t border-white/5 bg-white/5 flex gap-4">
                            <label className="flex items-center gap-3 cursor-pointer mr-auto">
                                <input type="checkbox" checked={editingPost.published || false} onChange={e => setEditingPost({...editingPost, published: e.target.checked})} className="w-5 h-5 rounded bg-black border-white/10 text-amber-500"/>
                                <span className="text-xs font-bold text-slate-400 uppercase">Publicar Insight</span>
                            </label>
                            <button onClick={() => setEditingPost(null)} className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">Cancelar</button>
                            <button onClick={handleSavePost} className="px-12 py-4 bg-amber-500 text-black font-black uppercase rounded-2xl text-[11px] shadow-xl flex items-center justify-center gap-2">
                                <Save className="w-4 h-4"/> Salvar Insight
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
