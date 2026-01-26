
import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, Building2, Edit, X, ArrowUpRight, Loader2, Save, CheckCircle2, Briefcase, ShieldCheck, Lock, Globe, Target, Zap, Mail, Phone, Key, AlertTriangle } from 'lucide-react';
import { fetchClients, createClient, updateClient } from '../services/clientService';
import { fetchProjects } from '../services/projectService';
import { DbClient, DbProject } from '../types';

interface Props {
    userRole?: string;
    onlineUsers?: string[];
    organizationId?: number; 
    onOpenProject?: (project: any) => void;
}

export const ClientsScreen: React.FC<Props> = ({ userRole, onlineUsers = [], organizationId, onOpenProject }) => {
    const [clients, setClients] = useState<DbClient[]>([]);
    const [allProjects, setAllProjects] = useState<DbProject[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    
    const [selectedClientForProjects, setSelectedClientForProjects] = useState<DbClient | null>(null);
    const [localProjectSelection, setLocalProjectSelection] = useState<number[]>([]);
    const [isUpdatingProjects, setIsUpdatingProjects] = useState(false);

    const [newClient, setNewClient] = useState({
        nome: '', email: '', senha: '', confirmarSenha: '', telefone: '', cnpj: '', status: 'Ativo'
    });

    useEffect(() => { 
        if (organizationId) {
            loadClients();
            fetchProjects(organizationId).then(setAllProjects);
        } else {
            setIsLoading(false);
        }
    }, [organizationId]);

    const loadClients = async () => {
        setIsLoading(true);
        const data = await fetchClients(organizationId!);
        setClients(data);
        setIsLoading(false);
    };

    // Máscara para CNPJ/CPF
    const maskCpfCnpj = (val: string) => {
        const cleanVal = val.replace(/\D/g, "");
        if (cleanVal.length <= 11) {
            return cleanVal
                .replace(/(\md{3})(\d)/, "$1.$2")
                .replace(/(\md{3})(\d)/, "$1.$2")
                .replace(/(\md{3})(\d{1,2})$/, "$1-$2");
        } else {
            return cleanVal
                .substring(0, 14)
                .replace(/^(\d{2})(\d)/, "$1.$2")
                .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
                .replace(/\.(\d{3})(\d)/, ".$1/$2")
                .replace(/(\d{4})(\d)/, "$1-$2");
        }
    };

    // Máscara para Telefone
    const maskPhone = (val: string) => {
        return val
            .replace(/\D/g, "")
            .replace(/(\d{2})(\d)/, "($1) $2")
            .replace(/(\d{5})(\d)/, "$1-$2")
            .substring(0, 15);
    };

    const handleCreateClient = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (!newClient.email || !newClient.nome || !newClient.senha) {
            setErrorMsg("Preencha os campos obrigatórios (Nome, E-mail e Senha).");
            return;
        }

        if (newClient.senha !== newClient.confirmarSenha) {
            setErrorMsg("A confirmação de senha não coincide com a senha inicial.");
            return;
        }

        setIsSaving(true);
        try {
            const { confirmarSenha, ...payload } = newClient;
            const result = await createClient({ ...payload, organizacao: organizationId }, newClient.senha);
            if (result) {
                setShowAddModal(false);
                setNewClient({ nome: '', email: '', senha: '', confirmarSenha: '', telefone: '', cnpj: '', status: 'Ativo' });
                loadClients();
            }
        } catch (err: any) {
            setErrorMsg(err.message || "Erro desconhecido ao sincronizar stakeholder.");
        } finally { setIsSaving(false); }
    };

    const handleOpenProjectManager = (client: DbClient) => {
        if (userRole === 'cliente') return;
        setSelectedClientForProjects(client);
        setLocalProjectSelection(client.projetos || []);
    };

    const toggleProject = (projectId: number) => {
        setLocalProjectSelection(prev => 
            prev.includes(projectId) 
            ? prev.filter(id => id !== projectId) 
            : [...prev, projectId]
        );
    };

    const handleSaveProjectAccess = async () => {
        if (!selectedClientForProjects) return;
        setIsUpdatingProjects(true);
        try {
            const updated = await updateClient(selectedClientForProjects.id, {
                projetos: localProjectSelection
            });
            if (updated) {
                setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
                setSelectedClientForProjects(null);
            }
        } catch (e: any) {
            alert("Erro ao salvar acessos: " + e.message);
        } finally {
            setIsUpdatingProjects(false);
        }
    };

    const filteredClients = clients.filter(c => c.nome.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="h-full flex flex-col p-6 md:p-10 space-y-10 animate-in fade-in duration-700">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter">
                        Base de <span className="text-amber-500">Stakeholders</span>.
                    </h1>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                    <div className="relative flex-1 sm:w-80">
                        <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400"/>
                        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar parceiro..." className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-[#333] rounded-2xl text-sm outline-none focus:border-amber-500 transition-all shadow-sm" />
                    </div>
                    {userRole !== 'cliente' && (
                        <button onClick={() => setShowAddModal(true)} className="px-8 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-amber-500 hover:text-black transition-all shadow-soft active:scale-95">
                            <Plus className="w-4 h-4"/> NOVO CLIENTE
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-24">
                {isLoading ? (
                    <div className="col-span-full py-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-amber-500"/></div>
                ) : filteredClients.map(client => (
                    <div 
                        key={client.id} 
                        onClick={() => handleOpenProjectManager(client)}
                        className="glass-card p-10 rounded-[2.5rem] flex flex-col justify-between h-[420px] transition-all group relative overflow-hidden cursor-pointer"
                    >
                        <div>
                            <div className="flex justify-between items-start mb-10">
                                <div className="w-20 h-20 rounded-[1.5rem] bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-[#333] overflow-hidden flex items-center justify-center">
                                    {client.logo_url ? <img src={client.logo_url} className="w-full h-full object-cover"/> : <Building2 className="w-10 h-10 text-slate-300"/>}
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${onlineUsers.includes(client.id) ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'text-slate-400 border-slate-200'}`}>{onlineUsers.includes(client.id) ? 'Online' : 'Offline'}</div>
                                    <div className="px-3 py-1 bg-amber-500/10 text-amber-600 border border-amber-500/10 rounded-lg text-[8px] font-black uppercase">{client.projetos?.length || 0} Ativos</div>
                                </div>
                            </div>
                            <h3 className="text-2xl font-black group-hover:text-amber-500 transition-colors truncate">{client.nome}</h3>
                            <div className="text-[11px] font-bold text-slate-400 mt-2 truncate">{client.email}</div>
                        </div>
                        <div className="pt-8 mt-8 border-t border-slate-100 dark:border-white/5 flex items-end justify-between">
                            <div className="space-y-1">
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">LOCALIZAÇÃO / IDENTIFICAÇÃO</div>
                                <div className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{client.cnpj || 'Sem Documento'}</div>
                            </div>
                            <button className="w-14 h-14 rounded-2xl border border-slate-200 dark:border-[#333] group-hover:bg-amber-500 group-hover:text-black group-hover:border-amber-500 transition-all shadow-sm"><ArrowUpRight className="w-7 h-7 mx-auto"/></button>
                        </div>
                    </div>
                ))}
            </div>

            {/* MODAL: NOVO PARCEIRO */}
            {showAddModal && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-2xl bg-white dark:bg-[#0A0A0C] rounded-[3.5rem] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-ios-pop flex flex-col">
                        <form onSubmit={handleCreateClient} className="flex flex-col">
                            <div className="p-10 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-white/5">
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">Novo <span className="text-amber-500">Parceiro</span>.</h2>
                                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.3em] mt-3">CADASTRO E ACESSO DO STAKEHOLDER</p>
                                </div>
                                <button type="button" onClick={() => setShowAddModal(false)} className="p-3 text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-all"><X className="w-7 h-7"/></button>
                            </div>

                            <div className="p-10 space-y-8 overflow-y-auto max-h-[60vh] custom-scrollbar">
                                {errorMsg && (
                                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-xs font-bold animate-in shake duration-300">
                                        <AlertTriangle className="w-5 h-5 shrink-0"/> {errorMsg}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">E-mail de Login</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                                        <input required type="email" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 pl-12 text-sm font-bold dark:text-white outline-none focus:border-amber-500 shadow-inner" placeholder="contato@empresa.com"/>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">Senha Inicial</label>
                                        <div className="relative group">
                                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                                            <input required type="password" value={newClient.senha} onChange={e => setNewClient({...newClient, senha: e.target.value})} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 pl-12 text-sm font-bold dark:text-white outline-none focus:border-amber-500 shadow-inner" placeholder="••••••••"/>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">Confirmar Senha</label>
                                        <div className="relative group">
                                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                                            <input required type="password" value={newClient.confirmarSenha} onChange={e => setNewClient({...newClient, confirmarSenha: e.target.value})} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 pl-12 text-sm font-bold dark:text-white outline-none focus:border-amber-500 shadow-inner" placeholder="••••••••"/>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">Nome Completo / Razão Social</label>
                                    <div className="relative group">
                                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                                        <input required value={newClient.nome} onChange={e => setNewClient({...newClient, nome: e.target.value})} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 pl-12 text-sm font-bold dark:text-white outline-none focus:border-amber-500 shadow-inner" placeholder="Ex: Shinkō Sistemas Ltda"/>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CNPJ / CPF</label>
                                        <input value={newClient.cnpj} onChange={e => setNewClient({...newClient, cnpj: maskCpfCnpj(e.target.value)})} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-sm font-bold dark:text-white outline-none" placeholder="00.000.000/0001-00"/>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone</label>
                                        <div className="relative group">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                                            <input value={newClient.telefone} onChange={e => setNewClient({...newClient, telefone: maskPhone(e.target.value)})} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 pl-12 text-sm font-bold dark:text-white outline-none" placeholder="(00) 00000-0000"/>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-10 border-t border-slate-100 dark:border-white/5 flex gap-6 bg-slate-50 dark:bg-white/5">
                                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all">Descartar</button>
                                <button type="submit" disabled={isSaving} className="flex-[2] py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50">
                                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5"/>} 
                                    {isSaving ? 'SINCRONIZANDO...' : 'SINCRONIZAR LOGIN & CADASTRO'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {selectedClientForProjects && (
                 <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-2xl bg-white dark:bg-[#0A0A0C] rounded-[3.5rem] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-ios-pop flex flex-col max-h-[90vh]">
                        <header className="p-10 border-b border-slate-100 dark:border-white/5 flex justify-between items-start bg-slate-50 dark:bg-white/5 shrink-0">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-[1.5rem] bg-amber-500 flex items-center justify-center text-black shadow-lg shadow-amber-500/20">
                                    <Target className="w-8 h-8 stroke-[2px]"/>
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">Gestão de Portfólio.</h2>
                                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] mt-2">DEFINIR ACESSO PARA: <span className="text-amber-600 dark:text-amber-500">{selectedClientForProjects.nome.toUpperCase()}</span></p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedClientForProjects(null)} className="p-3 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-all text-slate-400"><X className="w-7 h-7"/></button>
                        </header>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-8 bg-slate-50/50 dark:bg-black/20">
                            <div className="grid grid-cols-1 gap-4">
                                {allProjects.map(project => {
                                    const isSelected = localProjectSelection.includes(project.id);
                                    return (
                                        <button 
                                            key={project.id}
                                            onClick={() => toggleProject(project.id)}
                                            className={`p-6 rounded-[2rem] border text-left transition-all flex items-center justify-between group ${isSelected ? 'bg-amber-500 border-amber-400 text-black shadow-glow-amber scale-[1.02]' : 'bg-white dark:bg-white/5 border-slate-100 dark:border-white/10 text-slate-500 hover:border-amber-500/30'}`}
                                        >
                                            <div className="flex items-center gap-6">
                                                <div className={`p-4 rounded-2xl ${isSelected ? 'bg-black/10' : 'bg-slate-100 dark:bg-white/10'}`}>
                                                    <Briefcase className="w-6 h-6"/>
                                                </div>
                                                <div>
                                                    <div className={`text-base font-black uppercase tracking-tight ${isSelected ? 'text-black' : 'text-slate-900 dark:text-white'}`}>{project.nome}</div>
                                                    <div className={`text-[10px] font-bold mt-1 ${isSelected ? 'text-black/60' : 'text-slate-400'}`}>ID: {project.id} • {project.arquetipo}</div>
                                                </div>
                                            </div>
                                            <div className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-black border-black text-amber-500' : 'border-slate-200 dark:border-white/10 group-hover:border-amber-500'}`}>
                                                {isSelected ? <CheckCircle2 className="w-6 h-6 stroke-[3px]"/> : <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-white/10 group-hover:bg-amber-500"></div>}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="p-10 border-t border-slate-100 dark:border-white/5 bg-white dark:bg-[#0A0A0C] flex gap-6 shrink-0">
                            <button onClick={() => setSelectedClientForProjects(null)} className="flex-1 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Descartar</button>
                            <button 
                                onClick={handleSaveProjectAccess}
                                disabled={isUpdatingProjects}
                                className="flex-[2] py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[1.8rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isUpdatingProjects ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5"/>}
                                Sincronizar Portfólio
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
