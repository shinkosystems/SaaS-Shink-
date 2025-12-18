
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
    
    // UI State
    const [isLoading, setIsLoading] = useState(true);
    const [approvingId, setApprovingId] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
    const [editingCase, setEditingCase] = useState<Partial<CmsCase> | null>(null);
    const [editingPost, setEditingPost] = useState<Partial<CmsPost> | null>(null);
    
    // Local Tag State for Post Editor
    const [tagInput, setTagInput] = useState('');

    // Filters
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
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/--+/g, '-')
            .trim();
    };

    const handleSavePost = async () => {
        if (!editingPost?.title) {
            alert("Título é obrigatório.");
            return;
        }
        setIsLoading(true);
        try {
            await saveCmsPost(editingPost);
            setEditingPost(null);
            loadData();
        } catch (e) {
            alert("Erro ao salvar post.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveCase = async () => {
        if (!editingCase?.title) return;
        await saveCmsCase(editingCase);
        setEditingCase(null);
        loadData();
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
        if (!currentTags.includes(tagInput.trim())) {
            setEditingPost({ ...editingPost, tags: [...currentTags, tagInput.trim()] });
        }
        setTagInput('');
    };

    const removeTag = (tagToRemove: string) => {
        if (!editingPost) return;
        setEditingPost({ 
            ...editingPost, 
            tags: (editingPost.tags || []).filter(t => t !== tagToRemove) 
        });
    };

    return (
        <div className="h-full flex flex-col p-6 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-black/40">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Shield className="w-6 h-6 text-purple-600"/> Painel Super Admin
                    </h1>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Controle de Ecossistema Shinkō</p>
                </div>
                <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-white/5">
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
                            className={`px-4 py-2 rounded-lg text-xs font-bold capitalize flex items-center gap-2 transition-all ${activeTab === tab.id ? 'bg-slate-900 dark:bg-white shadow-lg text-white dark:text-slate-900' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            <tab.icon className="w-3.5 h-3.5"/>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading && !editingPost && <div className="flex flex-col items-center justify-center py-40 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-purple-500"/>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sincronizando...</span>
            </div>}

            {/* DASHBOARD VIEW */}
            {!isLoading && activeTab === 'dashboard' && metrics && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in duration-500">
                    <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-white/5 bg-white/50">
                        <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><DollarSign className="w-3 h-3"/> MRR Estimado</div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white">R$ {metrics.totalMrr.toLocaleString()}</div>
                    </div>
                    <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-white/5 bg-white/50">
                        <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Users className="w-3 h-3"/> Clientes Pagantes</div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white">{metrics.activeClients}</div>
                    </div>
                    <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-white/5 bg-white/50">
                        <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Activity className="w-3 h-3"/> DAU (Engajamento)</div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white">{metrics.dau}</div>
                    </div>
                    <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-white/5 bg-white/50">
                        <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Heart className="w-3 h-3"/> NPS Global</div>
                        <div className="text-3xl font-black text-emerald-500">{metrics.npsScore}</div>
                    </div>
                </div>
            )}

            {/* CLIENTS LIST */}
            {!isLoading && activeTab === 'clients' && (
                <div className="space-y-3 animate-in fade-in duration-500">
                    {users.map(u => (
                        <div key={u.id} className="flex justify-between items-center p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl hover:shadow-md transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center font-bold text-slate-500">
                                    {u.nome.charAt(0)}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 dark:text-white">{u.nome}</div>
                                    <div className="text-xs text-slate-500 font-medium">{u.orgName} • <span className="text-purple-500">{u.planName}</span></div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right hidden sm:block">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">Último Acesso</div>
                                    <div className="text-xs text-slate-600 dark:text-slate-300">{u.ultimo_acesso ? new Date(u.ultimo_acesso).toLocaleDateString() : 'N/A'}</div>
                                </div>
                                <button onClick={() => setEditingUser(u)} className="px-4 py-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 rounded-xl text-xs font-bold transition-colors">Gerenciar</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* APPROVALS */}
            {!isLoading && activeTab === 'approvals' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                    {approvals.length === 0 && <div className="col-span-3 py-20 text-center text-slate-500 border border-dashed border-slate-300 dark:border-white/10 rounded-3xl">Nenhuma aprovação pendente.</div>}
                    {approvals.map(a => (
                        <div key={a.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-amber-500/30 shadow-xl shadow-amber-500/5 flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block mb-1">Aguardando Aprovação</span>
                                    <h3 className="font-bold text-base text-slate-900 dark:text-white">{a.orgName}</h3>
                                </div>
                                <span className="text-[10px] font-mono text-slate-400">{new Date(a.date).toLocaleDateString()}</span>
                            </div>
                            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mb-6">R$ {a.amount.toLocaleString()}</div>
                            <div className="mt-auto flex gap-2 pt-4 border-t border-slate-100 dark:border-white/5">
                                {a.comprovante && (
                                    <a href={a.comprovante} target="_blank" className="flex-1 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-center text-xs font-bold text-slate-600 dark:text-white transition-all flex items-center justify-center gap-2">
                                        <ExternalLink className="w-3.5 h-3.5"/> Comprovante
                                    </a>
                                )}
                                <button 
                                    onClick={() => handleApprove(a.id.toString(), a.organizationId)} 
                                    disabled={approvingId === a.id.toString()}
                                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-center text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                                >
                                    {approvingId === a.id.toString() ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Check className="w-3.5 h-3.5"/>} Liberar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* CMS BLOG */}
            {!isLoading && activeTab === 'cms_blog' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <button onClick={() => setEditingPost({ title: '', content: '', tags: [], published: false, slug: '' })} className="w-full py-4 border-2 border-dashed border-slate-300 dark:border-white/10 rounded-2xl text-slate-400 font-black uppercase tracking-widest hover:border-amber-500/50 hover:bg-amber-500/5 transition-all flex items-center justify-center gap-2 group">
                        <Plus className="w-5 h-5 group-hover:scale-110 transition-transform"/> Publicar Novo Insight
                    </button>
                    <div className="space-y-3">
                        {cmsPosts.map(p => (
                            <div key={p.id} className="flex justify-between items-center p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl hover:shadow-md transition-all group">
                                <div className="flex items-center gap-5">
                                    <div className="w-16 h-12 bg-slate-100 dark:bg-black rounded-lg overflow-hidden border border-slate-200 dark:border-white/5">
                                        {p.cover_image && <img src={p.cover_image} className="w-full h-full object-cover"/>}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            {p.title}
                                            {p.download_url && <Download className="w-3 h-3 text-amber-500" title="Possui Material Rico"/>}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1">
                                            <div className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${p.published ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{p.published ? 'Publicado' : 'Rascunho'}</div>
                                            <span className="text-[10px] text-slate-400 font-mono">/{p.slug}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setEditingPost(p)} className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl text-slate-500 hover:text-blue-500 transition-colors"><Edit className="w-4 h-4"/></button>
                                    <button onClick={() => { if(confirm("Excluir post?")) deleteCmsPost(p.id).then(loadData); }} className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl text-slate-500 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* MODAL: FULL SCREEN BLOG EDITOR */}
            {editingPost && (
                <div className="fixed inset-0 z-[150] bg-slate-50 dark:bg-[#050505] flex flex-col animate-in slide-in-from-bottom-4 duration-500 overflow-hidden font-sans">
                    {/* Top Action Bar */}
                    <div className="h-20 shrink-0 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 flex justify-between items-center px-8 backdrop-blur-md">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setEditingPost(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors text-slate-500">
                                <ArrowLeft className="w-6 h-6"/>
                            </button>
                            <div className="w-px h-8 bg-slate-200 dark:bg-white/10 mx-2"></div>
                            <div>
                                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Editor de Insights</h2>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Publicação v2.5</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3 bg-slate-100 dark:bg-white/5 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10">
                                <span className="text-xs font-bold text-slate-500 uppercase">Visibilidade</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={editingPost.published || false} onChange={e => setEditingPost({...editingPost, published: e.target.checked})} className="sr-only peer"/>
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
                                    <span className="ml-3 text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">{editingPost.published ? 'Publicado' : 'Rascunho'}</span>
                                </label>
                            </div>
                            
                            <button 
                                onClick={handleSavePost}
                                disabled={isLoading}
                                className="px-8 py-3 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95 flex items-center gap-2"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} 
                                Salvar Alterações
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 flex overflow-hidden">
                        
                        {/* Editor Main Section */}
                        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-white dark:bg-transparent">
                            <div className="max-w-4xl mx-auto space-y-8">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block">Título do Artigo</label>
                                    <input 
                                        value={editingPost.title} 
                                        onChange={e => {
                                            const val = e.target.value;
                                            const updates: any = { title: val };
                                            if (!editingPost.id || !editingPost.slug) {
                                                updates.slug = generateSlug(val);
                                            }
                                            setEditingPost({...editingPost, ...updates});
                                        }} 
                                        className="text-4xl md:text-5xl font-black w-full bg-transparent outline-none text-slate-900 dark:text-white placeholder-slate-200 dark:placeholder-white/10 tracking-tight leading-tight" 
                                        placeholder="Título impactante aqui..."
                                        autoFocus
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <FileText className="w-3 h-3"/> Conteúdo Rico
                                    </label>
                                    <RichTextEditor 
                                        value={editingPost.content || ''} 
                                        onChange={html => setEditingPost({...editingPost, content: html})} 
                                        className="min-h-[600px] border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/20"
                                        placeholder="Comece a escrever seu insight..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Sidebar Configuration */}
                        <aside className="w-96 border-l border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 p-8 overflow-y-auto custom-scrollbar space-y-10">
                            
                            {/* SEO & URL */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-2">
                                    <Globe className="w-4 h-4 text-blue-500"/> SEO & Roteamento
                                </h3>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Slug da URL</label>
                                    <div className="relative group">
                                        <div className="absolute left-3 top-3.5 text-slate-500 text-xs font-bold">/blog/</div>
                                        <input 
                                            value={editingPost.slug} 
                                            onChange={e => setEditingPost({...editingPost, slug: generateSlug(e.target.value)})}
                                            className="w-full pl-14 pr-4 py-3 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-blue-500 text-xs font-mono text-slate-700 dark:text-slate-300"
                                            placeholder="url-amigavel-aqui"
                                        />
                                    </div>
                                    <p className="text-[9px] text-slate-500 italic px-1">O slug define o link final. Use apenas letras, números e hífens.</p>
                                </div>
                            </div>

                            {/* Cover Image */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-2">
                                    <ImageIcon className="w-4 h-4 text-purple-500"/> Imagem de Capa
                                </h3>
                                <div className="aspect-video border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group bg-slate-50 dark:bg-black/40 hover:border-purple-500/50 transition-colors">
                                    {editingPost.cover_image ? (
                                        <>
                                            <img src={editingPost.cover_image} className="w-full h-full object-cover"/>
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                <button className="p-2 bg-white rounded-lg text-black hover:scale-110 transition-transform"><Edit className="w-4 h-4"/></button>
                                                <button onClick={() => setEditingPost({...editingPost, cover_image: ''})} className="p-2 bg-red-600 rounded-lg text-white hover:scale-110 transition-transform"><Trash2 className="w-4 h-4"/></button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center p-6 cursor-pointer">
                                            <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2 group-hover:text-purple-500 transition-colors"/>
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Upload Capa</span>
                                        </div>
                                    )}
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, 'cover_image', true)}/>
                                </div>
                            </div>

                            {/* Tags Manager */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-2">
                                    <Tag className="w-4 h-4 text-amber-500"/> Categorias (Tags)
                                </h3>
                                <div className="flex gap-2">
                                    <input 
                                        value={tagInput}
                                        onChange={e => setTagInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && addTag()}
                                        placeholder="Adicionar tag..."
                                        className="flex-1 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-amber-500"
                                    />
                                    <button onClick={addTag} className="p-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl hover:opacity-90 transition-opacity"><Plus className="w-4 h-4"/></button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {editingPost.tags?.map(tag => (
                                        <span key={tag} className="px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-lg text-[10px] font-bold flex items-center gap-1 group">
                                            {tag}
                                            <button onClick={() => removeTag(tag)} className="hover:text-red-500"><X className="w-3 h-3"/></button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Rich Material / Download */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-2">
                                    <Download className="w-4 h-4 text-emerald-500"/> Material Rico (Lead Gen)
                                </h3>
                                <div className="space-y-4 bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Título do Download</label>
                                        <input 
                                            value={editingPost.download_title || ''} 
                                            onChange={e => setEditingPost({...editingPost, download_title: e.target.value})}
                                            placeholder="Ex: Checklist Framework RDE"
                                            className="w-full p-2.5 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-emerald-500 text-xs text-slate-700 dark:text-slate-300 font-bold"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Arquivo PDF/DOC</label>
                                        <div className="flex flex-col gap-2">
                                            {editingPost.download_url ? (
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/30 overflow-hidden">
                                                        <FileText className="w-4 h-4 text-emerald-500 shrink-0"/>
                                                        <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 truncate flex-1">{editingPost.download_url}</span>
                                                        <button onClick={() => setEditingPost({...editingPost, download_url: ''})} className="text-red-500 hover:scale-110 transition-transform shrink-0"><Trash2 className="w-3.5 h-3.5"/></button>
                                                    </div>
                                                    <a href={editingPost.download_url} target="_blank" className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-black text-white uppercase tracking-widest text-center flex items-center justify-center gap-2 transition-all">
                                                        <Eye className="w-3 h-3"/> Visualizar Documento
                                                    </a>
                                                </div>
                                            ) : (
                                                <div className="relative group">
                                                    <button className="w-full py-3 bg-white dark:bg-white/5 border border-dashed border-slate-300 dark:border-emerald-500/30 rounded-xl text-[10px] font-bold text-slate-500 dark:text-emerald-500 uppercase tracking-widest hover:bg-emerald-500/5 transition-all flex items-center justify-center gap-2">
                                                        <Plus className="w-3 h-3"/> Vincular Arquivo
                                                    </button>
                                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, 'download_url', true)}/>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </aside>
                    </div>
                </div>
            )}
        </div>
    );
};
