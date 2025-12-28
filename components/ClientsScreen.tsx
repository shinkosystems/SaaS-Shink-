
import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, Building2, Building, Edit, X, LayoutGrid, ArrowUpRight, Loader2, Target, Zap, TrendingUp, Mail, Lock, Phone, User, Globe, MapPin, Save, DollarSign } from 'lucide-react';
import { fetchClients, createClient, updateClient } from '../services/clientService';
import { DbClient } from '../types';

interface Props {
    userRole?: string;
    onlineUsers?: string[];
    organizationId?: number; 
    onOpenProject?: (project: any) => void;
}

export const ClientsScreen: React.FC<Props> = ({ userRole, onlineUsers = [], organizationId, onOpenProject }) => {
    const [clients, setClients] = useState<DbClient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [newClient, setNewClient] = useState({
        nome: '',
        email: '',
        senha: '',
        telefone: '',
        cnpj: '',
        endereco: '',
        valormensal: 0,
        status: 'Ativo'
    });

    useEffect(() => { 
        if (organizationId) {
            loadClients();
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

    const handleCreateClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newClient.email || !newClient.senha || !newClient.nome) {
            return alert("Nome, Email e Senha são obrigatórios.");
        }

        setIsSaving(true);
        try {
            const success = await createClient(
                { ...newClient, organizacao: organizationId },
                newClient.senha
            );
            if (success) {
                alert("Cliente e Login criados com sucesso!");
                setShowAddModal(false);
                setNewClient({ nome: '', email: '', senha: '', telefone: '', cnpj: '', endereco: '', valormensal: 0, status: 'Ativo' });
                loadClients();
            }
        } catch (e: any) {
            alert(e.message || "Erro ao criar cliente.");
        } finally {
            setIsSaving(false);
        }
    };

    const filteredClients = clients.filter(c => 
        c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col p-6 md:p-10 space-y-10 animate-in fade-in duration-700">
            {/* Header Estratégico */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                        Base de <span className="text-amber-500">Stakeholders</span>.
                    </h1>
                    <p className="text-slate-400 dark:text-[#A1A1AA] font-black uppercase tracking-[0.3em] text-[10px] mt-2">GESTÃO DE PARCEIROS E ACESSOS EXTERNOS</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                    <div className="relative flex-1 sm:w-80">
                        <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400"/>
                        <input 
                            type="text" 
                            placeholder="Buscar parceiro..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-[#333] rounded-2xl text-sm text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all shadow-sm"
                        />
                    </div>
                    {userRole !== 'cliente' && (
                        <button onClick={() => setShowAddModal(true)} className="px-8 py-3.5 bg-white dark:bg-white text-black dark:text-black rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-amber-500 transition-all shadow-soft active:scale-95">
                            <Plus className="w-4 h-4"/> NOVO CLIENTE
                        </button>
                    )}
                </div>
            </div>

            {/* Grid de Ativos */}
            {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-400">
                    <Loader2 className="w-10 h-10 animate-spin text-amber-500"/>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Sincronizando Ativos...</span>
                </div>
            ) : filteredClients.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-20 border-2 border-dashed border-slate-200 dark:border-[#333] rounded-[3rem]">
                    <Building2 className="w-16 h-16 text-slate-200 dark:text-slate-800 mb-4"/>
                    <h3 className="text-xl font-black text-slate-400">Nenhum parceiro no portfólio.</h3>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-24">
                    {filteredClients.map(client => (
                        <div key={client.id} className="glass-card p-10 rounded-[2.5rem] flex flex-col justify-between h-[420px] transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            
                            <div>
                                <div className="flex justify-between items-start mb-10">
                                    <div className="w-20 h-20 rounded-[1.5rem] bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-[#333] overflow-hidden flex items-center justify-center group-hover:border-amber-500/50 transition-colors shadow-inner">
                                        {client.logo_url ? <img src={client.logo_url} className="w-full h-full object-cover"/> : <Building2 className="w-10 h-10 text-slate-300 dark:text-slate-700"/>}
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-colors ${onlineUsers.includes(client.id) ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-slate-100 dark:bg-white/5 text-slate-400 border-slate-200 dark:border-[#333]'}`}>
                                            {onlineUsers.includes(client.id) ? 'Online' : 'Offline'}
                                        </div>
                                    </div>
                                </div>

                                <h3 className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors leading-none tracking-tighter truncate">{client.nome}</h3>
                                <div className="text-[11px] font-bold text-slate-400 dark:text-[#A1A1AA] mt-2 truncate">{client.email}</div>

                                <div className="flex gap-2 mt-8">
                                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#333] bg-slate-50 dark:bg-transparent">
                                        {client.status?.toUpperCase() || 'ATIVO'}
                                    </div>
                                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#333] bg-slate-50 dark:bg-transparent">
                                        {client.numcolaboradores || 1} TIME
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 mt-8 border-t border-slate-100 dark:border-white/5 flex items-end justify-between relative z-10">
                                <div className="space-y-1">
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">FEE OPERACIONAL</div>
                                    <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                                        <span className="text-sm mr-1.5 text-slate-300 font-bold">R$</span>
                                        {client.valormensal?.toLocaleString('pt-BR', {minimumFractionDigits: 0})}
                                    </div>
                                </div>
                                <button className="w-14 h-14 rounded-2xl border border-slate-200 dark:border-[#333] hover:bg-slate-900 dark:hover:bg-white hover:text-white dark:hover:text-black flex items-center justify-center transition-all group/btn shadow-soft">
                                    <ArrowUpRight className="w-7 h-7 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform"/>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODAL: NOVO CLIENTE */}
            {showAddModal && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl animate-in fade-in">
                    <div className="w-full max-w-2xl bg-white dark:bg-[#0A0A0C] rounded-[3rem] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-ios-pop flex flex-col max-h-[90vh]">
                        <form onSubmit={handleCreateClient} className="flex flex-col h-full">
                            <div className="p-10 pb-4 flex justify-between items-center">
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Novo <span className="text-amber-500">Parceiro</span>.</h2>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2">CONFIGURAÇÃO DE ACESSO E CONTRATO</p>
                                </div>
                                <button type="button" onClick={() => setShowAddModal(false)} className="p-3 text-slate-400 hover:text-red-500 transition-colors"><X className="w-6 h-6"/></button>
                            </div>

                            <div className="p-10 pt-6 space-y-8 overflow-y-auto custom-scrollbar flex-1">
                                {/* Dados de Acesso */}
                                <div className="space-y-6">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                                        <Lock className="w-3.5 h-3.5 text-amber-500"/> Credenciais de Sistema
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Email de Login</label>
                                            <div className="relative">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                                                <input required type="email" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-bold outline-none focus:border-amber-500 transition-all" placeholder="cliente@empresa.com"/>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Senha Inicial</label>
                                            <div className="relative">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                                                <input required type="password" value={newClient.senha} onChange={e => setNewClient({...newClient, senha: e.target.value})} className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-bold outline-none focus:border-amber-500 transition-all" placeholder="••••••••"/>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Dados Cadastrais */}
                                <div className="space-y-6">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                                        <Building2 className="w-3.5 h-3.5 text-blue-500"/> Informações da Conta
                                    </h3>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome Completo / Razão Social</label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                                            <input required value={newClient.nome} onChange={e => setNewClient({...newClient, nome: e.target.value})} className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-bold outline-none focus:border-amber-500 transition-all" placeholder="Ex: Shinkō Sistemas Ltda"/>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">CNPJ / CPF</label>
                                            <input value={newClient.cnpj} onChange={e => setNewClient({...newClient, cnpj: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-bold outline-none" placeholder="00.000.000/0001-00"/>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Telefone</label>
                                            <input value={newClient.telefone} onChange={e => setNewClient({...newClient, telefone: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-bold outline-none" placeholder="(00) 00000-0000"/>
                                        </div>
                                    </div>
                                </div>

                                {/* Contrato */}
                                <div className="space-y-6">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                                        <DollarSign className="w-3.5 h-3.5 text-emerald-500"/> Variáveis Financeiras
                                    </h3>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Valor do Fee Mensal (R$)</label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">R$</div>
                                            <input type="number" value={newClient.valormensal} onChange={e => setNewClient({...newClient, valormensal: Number(e.target.value)})} className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-black outline-none text-emerald-500" placeholder="0,00"/>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-10 border-t border-slate-100 dark:border-white/5 flex gap-4 bg-slate-50/50 dark:bg-black/20">
                                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Descartar</button>
                                <button type="submit" disabled={isSaving} className="flex-[2] py-5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5"/>}
                                    Sincronizar Login & Cadastro
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
