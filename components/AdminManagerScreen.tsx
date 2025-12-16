
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
        // Logic to save user updates (mock for brevity, connect to service in real)
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

    const handleSavePost = async () => {
        if (!editingPost?.title) return;
        await saveCmsPost(editingPost);
        setEditingPost(null);
        loadData();
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
        const url = await uploadCmsFile(file, 'fotoperfil');
        if (url) {
            if (isPost && editingPost) setEditingPost({ ...editingPost, [field]: url });
            else if (!isPost && editingCase) setEditingCase({ ...editingCase, [field as keyof CmsCase]: url });
        }
    };

    return (
        <div className="h-full flex flex-col p-6 overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Shield className="w-6 h-6 text-purple-600"/> Painel Super Admin
                </h1>
                <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                    {['dashboard', 'clients', 'approvals', 'cms_cases', 'cms_blog'].map((tab) => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold capitalize ${activeTab === tab ? 'bg-white dark:bg-white/10 shadow text-slate-900 dark:text-white' : 'text-slate-500'}`}
                        >
                            {tab.replace('cms_', '')}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading && <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-purple-500"/></div>}

            {!isLoading && activeTab === 'dashboard' && metrics && (
                <div className="grid grid-cols-4 gap-4">
                    <div className="glass-panel p-5 rounded-xl"><div className="text-xs font-bold text-slate-500">MRR Total</div><div className="text-2xl font-black">R$ {metrics.totalMrr.toLocaleString()}</div></div>
                    <div className="glass-panel p-5 rounded-xl"><div className="text-xs font-bold text-slate-500">Clientes Ativos</div><div className="text-2xl font-black">{metrics.activeClients}</div></div>
                    <div className="glass-panel p-5 rounded-xl"><div className="text-xs font-bold text-slate-500">Ticket Médio</div><div className="text-2xl font-black">R$ {metrics.avgTicket.toFixed(0)}</div></div>
                    <div className="glass-panel p-5 rounded-xl"><div className="text-xs font-bold text-slate-500">NPS</div><div className="text-2xl font-black">{metrics.npsScore}</div></div>
                </div>
            )}

            {!isLoading && activeTab === 'clients' && (
                <div className="space-y-2">
                    {users.map(u => (
                        <div key={u.id} className="flex justify-between items-center p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl">
                            <div>
                                <div className="font-bold">{u.nome}</div>
                                <div className="text-xs text-slate-500">{u.orgName} • {u.planName}</div>
                            </div>
                            <button onClick={() => setEditingUser(u)} className="px-3 py-1 bg-slate-100 dark:bg-white/10 rounded text-xs font-bold">Editar</button>
                        </div>
                    ))}
                </div>
            )}

            {!isLoading && activeTab === 'approvals' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {approvals.length === 0 && <div className="col-span-3 text-center text-slate-500">Nenhuma aprovação pendente.</div>}
                    {approvals.map(a => (
                        <div key={a.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-amber-500/20">
                            <div className="flex justify-between mb-2">
                                <span className="font-bold text-sm">{a.orgName}</span>
                                <span className="text-xs font-mono text-slate-500">{new Date(a.date).toLocaleDateString()}</span>
                            </div>
                            <div className="text-xl font-black text-emerald-500 mb-4">R$ {a.amount.toLocaleString()}</div>
                            <div className="flex gap-2">
                                {a.comprovante && <a href={a.comprovante} target="_blank" className="flex-1 py-2 bg-slate-100 dark:bg-white/5 rounded text-center text-xs font-bold">Ver Comp.</a>}
                                <button 
                                    onClick={() => handleApprove(a.id.toString(), a.organizationId)} 
                                    disabled={approvingId === a.id.toString()}
                                    className="flex-1 py-2 bg-emerald-600 text-white rounded text-center text-xs font-bold flex items-center justify-center gap-1"
                                >
                                    {approvingId === a.id.toString() ? <Loader2 className="w-3 h-3 animate-spin"/> : <Check className="w-3 h-3"/>} Aprovar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!isLoading && activeTab === 'cms_cases' && (
                <div className="space-y-4">
                    <button onClick={() => setEditingCase({ title: '' })} className="w-full py-3 border border-dashed border-slate-300 dark:border-white/10 rounded-xl text-slate-500 font-bold hover:bg-slate-50 dark:hover:bg-white/5">+ Novo Case</button>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {cmsCases.map(c => (
                            <div key={c.id} className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 group relative">
                                <div className="h-32 bg-slate-200 dark:bg-black">
                                    {c.image_url && <img src={c.image_url} className="w-full h-full object-cover opacity-80"/>}
                                </div>
                                <div className="p-4">
                                    <div className="font-bold text-sm">{c.title}</div>
                                    <div className="text-xs text-slate-500 mt-1">{c.metric}</div>
                                </div>
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditingCase(c)} className="p-1 bg-white rounded shadow text-blue-500"><Edit className="w-3 h-3"/></button>
                                    <button onClick={() => deleteCmsCase(c.id).then(loadData)} className="p-1 bg-white rounded shadow text-red-500"><Trash2 className="w-3 h-3"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!isLoading && activeTab === 'cms_blog' && (
                <div className="space-y-4">
                    <button onClick={() => setEditingPost({ title: '', content: '' })} className="w-full py-3 border border-dashed border-slate-300 dark:border-white/10 rounded-xl text-slate-500 font-bold hover:bg-slate-50 dark:hover:bg-white/5">+ Novo Artigo</button>
                    {cmsPosts.map(p => (
                        <div key={p.id} className="flex justify-between items-center p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-slate-200 rounded overflow-hidden">
                                    {p.cover_image && <img src={p.cover_image} className="w-full h-full object-cover"/>}
                                </div>
                                <div>
                                    <div className="font-bold text-sm">{p.title}</div>
                                    <div className={`text-[10px] px-2 py-0.5 rounded inline-block ${p.published ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>{p.published ? 'Publicado' : 'Rascunho'}</div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setEditingPost(p)} className="p-2 hover:bg-slate-100 rounded text-slate-500"><Edit className="w-4 h-4"/></button>
                                <button onClick={() => deleteCmsPost(p.id).then(loadData)} className="p-2 hover:bg-red-50 rounded text-red-500"><Trash2 className="w-4 h-4"/></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modals */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl w-full max-w-md shadow-2xl">
                        <h3 className="font-bold text-lg mb-4">Editar {editingUser.nome}</h3>
                        <div className="space-y-3">
                            <input value={editingUser.orgName} onChange={e => setEditingUser({...editingUser, orgName: e.target.value})} className="w-full p-2 border rounded" placeholder="Empresa"/>
                            <div className="flex gap-2">
                                <input type="number" value={editingUser.orgColaboradores} onChange={e => setEditingUser({...editingUser, orgColaboradores: Number(e.target.value)})} className="w-1/2 p-2 border rounded" placeholder="Users Limit"/>
                                <select value={editingUser.currentPlanId} onChange={e => setEditingUser({...editingUser, currentPlanId: Number(e.target.value)})} className="w-1/2 p-2 border rounded">
                                    {plans.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                                </select>
                            </div>
                            <button onClick={() => handleSaveUser(editingUser)} className="w-full bg-blue-600 text-white py-2 rounded font-bold">Salvar</button>
                            <button onClick={() => setEditingUser(null)} className="w-full text-slate-500 py-2 text-sm">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {editingPost && (
                <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-950 flex flex-col">
                    <div className="p-4 border-b flex justify-between items-center">
                        <button onClick={() => setEditingPost(null)}><ArrowLeft className="w-5 h-5"/></button>
                        <span className="font-bold">Editor de Blog</span>
                        <button onClick={handleSavePost} className="px-4 py-2 bg-black text-white rounded-lg text-xs font-bold">Salvar</button>
                    </div>
                    <div className="flex-1 p-8 max-w-4xl mx-auto w-full overflow-y-auto">
                        <input value={editingPost.title} onChange={e => setEditingPost({...editingPost, title: e.target.value})} className="text-3xl font-bold w-full bg-transparent outline-none mb-6" placeholder="Título do Artigo"/>
                        <div className="mb-6 h-40 border-2 border-dashed rounded-xl flex items-center justify-center relative overflow-hidden group">
                            {editingPost.cover_image ? <img src={editingPost.cover_image} className="w-full h-full object-cover absolute"/> : <span className="text-slate-400">Capa</span>}
                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, 'cover_image', true)}/>
                        </div>
                        <RichTextEditor value={editingPost.content || ''} onChange={html => setEditingPost({...editingPost, content: html})} className="min-h-[400px]"/>
                        <div className="mt-4 flex gap-4 items-center">
                            <label className="flex items-center gap-2"><input type="checkbox" checked={editingPost.published || false} onChange={e => setEditingPost({...editingPost, published: e.target.checked})}/> Publicar</label>
                            <input type="file" onChange={(e) => handleFileUpload(e, 'download_url', true)}/>
                        </div>
                    </div>
                </div>
            )}

            {editingCase && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl w-full max-w-lg shadow-2xl">
                        <h3 className="font-bold mb-4">Editar Case</h3>
                        <div className="space-y-3">
                            <input value={editingCase.title || ''} onChange={e => setEditingCase({...editingCase, title: e.target.value})} className="w-full p-2 border rounded" placeholder="Título"/>
                            <input value={editingCase.metric || ''} onChange={e => setEditingCase({...editingCase, metric: e.target.value})} className="w-full p-2 border rounded" placeholder="Métrica (Ex: +200% ROI)"/>
                            <textarea value={editingCase.description || ''} onChange={e => setEditingCase({...editingCase, description: e.target.value})} className="w-full p-2 border rounded h-24" placeholder="Descrição"/>
                            <div className="border p-2 rounded relative">
                                <span className="text-xs text-slate-500">Imagem de Capa</span>
                                <input type="file" onChange={(e) => handleFileUpload(e, 'image_url')}/>
                            </div>
                            <button onClick={handleSaveCase} className="w-full bg-blue-600 text-white py-2 rounded font-bold">Salvar</button>
                            <button onClick={() => setEditingCase(null)} className="w-full text-slate-500 py-2 text-sm">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
