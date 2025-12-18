
import React, { useState, useEffect, useRef } from 'react';
import { fetchAllOwners, updateGlobalClientData, fetchPlans, fetchGlobalMetrics, AdminUser, GlobalMetrics, updateUserStatus, fetchPendingApprovals, approveSubscription } from '../services/adminService';
import { fetchCmsCases, saveCmsCase, deleteCmsCase, fetchCmsPosts, saveCmsPost, deleteCmsPost, uploadCmsFile } from '../services/cmsService';
import { DbPlan, FinancialTransaction, CmsCase, CmsPost } from '../types';
import { Shield, Search, CreditCard, Loader2, Edit, CheckCircle, AlertTriangle, User, Zap, Building2, Users, DollarSign, TrendingUp, Activity, Filter, Calendar, Heart, UserMinus, Gem, MousePointer2, X, Clock, BarChart3, Wifi, Lock, ExternalLink, Check, Briefcase, FileText, Image as ImageIcon, Link as LinkIcon, Download, Save, Plus, Trash2, ArrowLeft, Globe, Tag, Eye, UploadCloud } from 'lucide-react';
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

    const handleApprove = async (transactionId: string, orgId: number) => {
        if (!confirm("Aprovar pagamento e liberar acesso?")) return;
        setApprovingId(transactionId);
        try {
            await approveSubscription(transactionId, orgId);
            setApprovals(prev => prev.filter(a => a.id.toString() !== transactionId));
            alert("Aprovado com sucesso!");
        } catch (e) { alert("Erro ao aprovar."); }
        setApprovingId(null);
    };

    const handleSaveUser = async (updated: AdminUser) => {
        await updateGlobalClientData({
            userId: updated.id,
            orgId: updated.organizacao,
            userName: updated.nome,
            orgName: updated.orgName || '',
            orgLimit: updated.orgColaboradores || 1,
            userStatus: updated.status,
            planId: updated.currentPlanId || 4,
            start: updated.subscription_start || '',
            end: updated.subscription_end || '',
            value: 0
        });
        setEditingUser(null);
        loadData();
    };

    const generateSlug = (text: string) => {
        return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/--+/g, '-').trim();
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

    return (
        <div className="h-full flex flex-col p-6 overflow-y-auto custom-scrollbar">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <Shield className="w-8 h-8 text-amber-500"/> Painel Super Admin
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-[0.2em] mt-2">Controle de Ecossistema Shinkō</p>
                </div>
                <div className="flex bg-white dark:bg-white/5 p-1 rounded-2xl shadow-xl border border-slate-200 dark:border-white/10 backdrop-blur-md">
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
                            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === tab.id ? 'bg-slate-900 dark:bg-white shadow-lg text-white dark:text-slate-900 scale-105' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                        >
                            <tab.icon className="w-3.5 h-3.5"/>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading && !editingPost && (
                <div className="flex flex-col items-center justify-center py-40 gap-4">
                    <Loader2 className="w-12 h-12 animate-spin text-amber-500"/>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Sincronizando Ecossistema...</span>
                </div>
            )}

            {/* DASHBOARD VIEW (KPI CARDS FIX) */}
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

                    <div className="glass-card-kpi p-8 rounded-[2rem] border border-slate-200 dark:border-white/5 flex flex-col justify-between h-44 relative group overflow-hidden">
                        <div className="relative z-10">
                            <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                <Users className="w-3 h-3 text-blue-500"/> Clientes Pagantes
                            </div>
                            <div className="text-4xl font-black text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">
                                {metrics.activeClients}
                            </div>
                        </div>
                        <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Users className="w-32 h-32 text-white" />
                        </div>
                    </div>

                    <div className="glass-card-kpi p-8 rounded-[2rem] border border-slate-200 dark:border-white/5 flex flex-col justify-between h-44 relative group overflow-hidden">
                        <div className="relative z-10">
                            <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                <Activity className="w-3 h-3 text-purple-500"/> DAU (Engajamento)
                            </div>
                            <div className="text-4xl font-black text-slate-900 dark:text-white group-hover:text-purple-500 transition-colors">
                                {metrics.dau}
                            </div>
                        </div>
                        <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Zap className="w-32 h-32 text-white" />
                        </div>
                    </div>

                    <div className="glass-card-kpi p-8 rounded-[2rem] border border-slate-200 dark:border-white/5 flex flex-col justify-between h-44 relative group overflow-hidden">
                        <div className="relative z-10">
                            <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                <Heart className="w-3 h-3 text-pink-500"/> NPS Global
                            </div>
                            <div className="text-4xl font-black text-emerald-600 dark:text-emerald-400">
                                {metrics.npsScore}
                            </div>
                        </div>
                        <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Heart className="w-32 h-32 text-white" />
                        </div>
                    </div>
                </div>
            )}

            {/* CLIENTS LIST */}
            {!isLoading && activeTab === 'clients' && (
                <div className="space-y-4 animate-in fade-in duration-500">
                    {users.map(u => (
                        <div key={u.id} className="flex justify-between items-center p-6 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-3xl hover:border-amber-500/30 transition-all hover:shadow-2xl hover:shadow-black/20 group">
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/10 flex items-center justify-center font-black text-xl text-slate-500 dark:text-white group-hover:scale-110 transition-transform">
                                    {u.nome.charAt(0)}
                                </div>
                                <div>
                                    <div className="font-black text-lg text-slate-900 dark:text-white">{u.nome}</div>
                                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">{u.orgName} • <span className="text-amber-500">{u.planName}</span></div>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-right hidden sm:block">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Último Acesso</div>
                                    <div className="text-xs text-slate-600 dark:text-slate-300 font-mono mt-1">{u.ultimo_acesso ? new Date(u.ultimo_acesso).toLocaleDateString() : 'N/A'}</div>
                                </div>
                                <button onClick={() => setEditingUser(u)} className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-105 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95">Gerenciar</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* CMS BLOG (MANTIDO) */}
            {!isLoading && activeTab === 'cms_blog' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <button onClick={() => setEditingPost({ title: '', content: '', tags: [], published: false, slug: '' })} className="w-full py-6 border-2 border-dashed border-slate-300 dark:border-white/10 rounded-[2rem] text-slate-400 font-black uppercase tracking-[0.3em] hover:border-amber-500/50 hover:bg-amber-500/5 transition-all flex items-center justify-center gap-4 group">
                        <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-500"/> Publicar Novo Insight
                    </button>
                    <div className="grid grid-cols-1 gap-4">
                        {cmsPosts.map(p => (
                            <div key={p.id} className="flex justify-between items-center p-6 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-3xl hover:shadow-2xl transition-all group">
                                <div className="flex items-center gap-6">
                                    <div className="w-20 h-14 bg-black rounded-xl overflow-hidden border border-white/5 shrink-0">
                                        {p.cover_image && <img src={p.cover_image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"/>}
                                    </div>
                                    <div>
                                        <div className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-3">
                                            {p.title}
                                            {p.download_url && <Download className="w-4 h-4 text-emerald-500"/>}
                                        </div>
                                        <div className="flex items-center gap-4 mt-2">
                                            <div className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wider ${p.published ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-500/20 text-slate-500'}`}>{p.published ? 'Publicado' : 'Rascunho'}</div>
                                            <span className="text-[10px] text-slate-500 font-mono">/{p.slug}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setEditingPost(p)} className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl text-slate-500 hover:text-amber-500 transition-all hover:scale-110"><Edit className="w-5 h-5"/></button>
                                    <button onClick={() => { if(confirm("Excluir post?")) deleteCmsPost(p.id).then(loadData); }} className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl text-slate-500 hover:text-red-500 transition-all hover:scale-110"><Trash2 className="w-5 h-5"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* BLOG EDITOR MODAL (MANTIDO) */}
            {editingPost && (
                <div className="fixed inset-0 z-[150] bg-[#020203] flex flex-col animate-in slide-in-from-bottom-10 duration-500 overflow-hidden">
                    <div className="h-20 shrink-0 border-b border-white/5 bg-black/40 flex justify-between items-center px-10 backdrop-blur-xl">
                        <div className="flex items-center gap-6">
                            <button onClick={() => setEditingPost(null)} className="p-3 hover:bg-white/5 rounded-2xl transition-all text-slate-400 hover:text-white">
                                <ArrowLeft className="w-6 h-6"/>
                            </button>
                            <div className="w-px h-10 bg-white/10"></div>
                            <div>
                                <h2 className="text-xl font-black text-white uppercase tracking-tighter">Editor de Insights</h2>
                                <p className="text-[10px] text-amber-500 font-black uppercase tracking-[0.3em]">Engineering V2.5</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-4 bg-white/5 px-5 py-2.5 rounded-2xl border border-white/10">
                                <span className="text-[10px] font-black text-slate-500 uppercase">Visibilidade</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={editingPost.published || false} onChange={e => setEditingPost({...editingPost, published: e.target.checked})} className="sr-only peer"/>
                                    <div className="w-12 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                                </label>
                            </div>
                            <button onClick={handleSavePost} disabled={isLoading} className="px-10 py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-all active:scale-95 flex items-center gap-3">
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} Salvar Insight
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 flex overflow-hidden">
                        <div className="flex-1 p-10 overflow-y-auto custom-scrollbar bg-transparent">
                            <div className="max-w-4xl mx-auto space-y-12">
                                <input value={editingPost.title} onChange={e => setEditingPost({...editingPost, title: e.target.value, slug: generateSlug(e.target.value)})} className="text-5xl md:text-7xl font-black w-full bg-transparent outline-none text-white placeholder-white/5 tracking-tighter leading-tight" placeholder="Título do Insight..."/>
                                <RichTextEditor value={editingPost.content || ''} onChange={html => setEditingPost({...editingPost, content: html})} className="min-h-[70vh] border-white/5 bg-white/5" placeholder="Sua expertise começa aqui..."/>
                            </div>
                        </div>
                        <aside className="w-96 border-l border-white/5 bg-black/20 p-10 overflow-y-auto custom-scrollbar space-y-10">
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-3 border-b border-white/5 pb-4"><Globe className="w-4 h-4 text-blue-500"/> SEO & Slug</h3>
                                <div className="space-y-2">
                                    <div className="relative group bg-white/5 p-4 rounded-2xl border border-white/10">
                                        <div className="text-[10px] text-slate-500 font-black uppercase mb-1">Caminho da URL</div>
                                        <input value={editingPost.slug} onChange={e => setEditingPost({...editingPost, slug: generateSlug(e.target.value)})} className="w-full bg-transparent outline-none text-xs font-mono text-amber-500" placeholder="url-amigavel"/>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-3 border-b border-white/5 pb-4"><ImageIcon className="w-4 h-4 text-purple-500"/> Imagem de Capa</h3>
                                <div className="aspect-video border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden group bg-white/5 hover:border-purple-500/50 transition-all cursor-pointer">
                                    {editingPost.cover_image ? (
                                        <img src={editingPost.cover_image} className="w-full h-full object-cover"/>
                                    ) : (
                                        <div className="text-center p-6"><UploadCloud className="w-10 h-10 text-slate-500 mx-auto mb-3 group-hover:text-purple-500 transition-colors"/><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fazer Upload</span></div>
                                    )}
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, 'cover_image', true)}/>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-3 border-b border-white/5 pb-4"><Tag className="w-4 h-4 text-amber-500"/> Tags</h3>
                                <div className="flex gap-2"><input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} placeholder="Add tag..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-amber-500"/><button onClick={addTag} className="p-2.5 bg-white text-black rounded-xl hover:scale-105 transition-all"><Plus className="w-4 h-4"/></button></div>
                                <div className="flex flex-wrap gap-2">{editingPost.tags?.map(tag => (<span key={tag} className="px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl text-[10px] font-black uppercase flex items-center gap-2">{tag}</span>))}</div>
                            </div>
                        </aside>
                    </div>
                </div>
            )}
        </div>
    );
};
