
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

    const [newClient, setNewClient] = useState({
        nome: '', email: '', senha: '', telefone: '', cnpj: '', endereco: '', valormensal: 0, status: 'Ativo'
    });

    useEffect(() => { 
        if (organizationId) loadClients();
        else setIsLoading(false);
    }, [organizationId]);

    const loadClients = async () => {
        setIsLoading(true);
        const data = await fetchClients(organizationId!);
        setClients(data);
        setIsLoading(false);
    };

    const handleCreateClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newClient.email || !newClient.senha || !newClient.nome) return alert("Dados obrigatórios faltando.");
        setIsSaving(true);
        try {
            const success = await createClient({ ...newClient, organizacao: organizationId }, newClient.senha);
            if (success) {
                setShowAddModal(false);
                setNewClient({ nome: '', email: '', senha: '', telefone: '', cnpj: '', endereco: '', valormensal: 0, status: 'Ativo' });
                loadClients();
            }
        } finally { setIsSaving(false); }
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
                        <button onClick={() => setShowAddModal(true)} className="px-8 py-3.5 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-amber-500 transition-all shadow-soft active:scale-95">
                            <Plus className="w-4 h-4"/> NOVO CLIENTE
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-24">
                {filteredClients.map(client => (
                    <div key={client.id} className="glass-card p-10 rounded-[2.5rem] flex flex-col justify-between h-[420px] transition-all group relative overflow-hidden">
                        <div>
                            <div className="flex justify-between items-start mb-10">
                                <div className="w-20 h-20 rounded-[1.5rem] bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-[#333] overflow-hidden flex items-center justify-center">
                                    {client.logo_url ? <img src={client.logo_url} className="w-full h-full object-cover"/> : <Building2 className="w-10 h-10 text-slate-300"/>}
                                </div>
                                <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${onlineUsers.includes(client.id) ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'text-slate-400 border-slate-200'}`}>{onlineUsers.includes(client.id) ? 'Online' : 'Offline'}</div>
                            </div>
                            <h3 className="text-2xl font-black group-hover:text-amber-500 transition-colors truncate">{client.nome}</h3>
                            <div className="text-[11px] font-bold text-slate-400 mt-2 truncate">{client.email}</div>
                        </div>
                        <div className="pt-8 mt-8 border-t border-slate-100 dark:border-white/5 flex items-end justify-between">
                            <div className="space-y-1">
                                <div className="text-[9px] font-black text-slate-400 uppercase">FEE OPERACIONAL</div>
                                <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">R$ {client.valormensal?.toLocaleString('pt-BR')}</div>
                            </div>
                            <button className="w-14 h-14 rounded-2xl border border-slate-200 dark:border-[#333] hover:bg-slate-900 hover:text-white transition-all"><ArrowUpRight className="w-7 h-7 mx-auto"/></button>
                        </div>
                    </div>
                ))}
            </div>

            {showAddModal && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl animate-in fade-in">
                    <div className="w-full max-w-2xl bg-[#0A0A0C] rounded-[3.5rem] shadow-2xl border border-white/10 overflow-hidden animate-ios-pop flex flex-col">
                        <form onSubmit={handleCreateClient} className="flex flex-col">
                            <div className="p-8 pb-4 flex justify-between items-center bg-white/5">
                                <div>
                                    <h2 className="text-2xl font-black text-white">Novo <span className="text-amber-500">Parceiro</span>.</h2>
                                    <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Setup de Acesso e Contrato</p>
                                </div>
                                <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white"><X className="w-6 h-6"/></button>
                            </div>

                            <div className="p-8 space-y-8">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2"><Lock className="w-3 h-3"/> E-mail de Login</label>
                                        <input required type="email" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white outline-none focus:border-amber-500" placeholder="cliente@empresa.com"/>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2"><Lock className="w-3 h-3"/> Senha Inicial</label>
                                        <input required type="password" value={newClient.senha} onChange={e => setNewClient({...newClient, senha: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white outline-none focus:border-amber-500" placeholder="••••••••"/>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2"><Building2 className="w-3 h-3"/> Nome Completo / Razão Social</label>
                                    <input required value={newClient.nome} onChange={e => setNewClient({...newClient, nome: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white outline-none focus:border-amber-500" placeholder="Ex: Shinkō Sistemas Ltda"/>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">CNPJ / CPF</label>
                                        <input value={newClient.cnpj} onChange={e => setNewClient({...newClient, cnpj: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white outline-none" placeholder="00.000.000/0001-00"/>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Telefone</label>
                                        <input value={newClient.telefone} onChange={e => setNewClient({...newClient, telefone: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white outline-none" placeholder="(00) 00000-0000"/>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Valor do Fee Mensal (R$)</label>
                                    <input type="number" value={newClient.valormensal} onChange={e => setNewClient({...newClient, valormensal: Number(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xl font-black text-emerald-500 outline-none" placeholder="0"/>
                                </div>
                            </div>

                            <div className="p-8 border-t border-white/5 flex gap-4 bg-white/5">
                                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-500">Descartar</button>
                                <button type="submit" disabled={isSaving} className="flex-[2] py-5 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3">
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} SINCRONIZAR LOGIN & CADASTRO
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
