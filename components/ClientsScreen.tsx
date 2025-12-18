
import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, Building2, Building, Edit, X, LayoutGrid, ArrowUpRight, Loader2, Target, Zap, TrendingUp } from 'lucide-react';
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

    useEffect(() => { 
        if (organizationId) {
            loadClients();
        } else {
            setIsLoading(false);
        }
    }, [organizationId]);

    const loadClients = async () => {
        setIsLoading(true);
        // fetchClients agora utiliza o organizationId do usuário logado de forma restrita
        const data = await fetchClients(organizationId!);
        setClients(data);
        setIsLoading(false);
    };

    const filteredClients = clients.filter(c => 
        c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col p-8 md:p-12 space-y-12 animate-in fade-in duration-700">
            {/* Header Estratégico */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-4">
                        <Users className="w-3 h-3"/> Gestão de Stakeholders
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white leading-none tracking-tighter">
                        Base de <span className="text-amber-500">Parceiros</span>.
                    </h1>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-4">Ativos e Contratos Vinculados à Organização</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                    <div className="relative flex-1 sm:w-80">
                        <Search className="absolute left-4 top-4 w-4 h-4 text-slate-400"/>
                        <input 
                            type="text" 
                            placeholder="Buscar por nome ou email..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[1.8rem] text-sm text-slate-900 dark:text-white outline-none focus:border-amber-500/50 transition-all shadow-sm"
                        />
                    </div>
                    <button className="px-10 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[1.8rem] font-black text-[11px] uppercase tracking-widest shinko-button shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-3">
                        <Plus className="w-4 h-4"/> Novo Cliente
                    </button>
                </div>
            </div>

            {/* Grid de Ativos */}
            {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-400">
                    <Loader2 className="w-12 h-12 animate-spin text-amber-500"/>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Sincronizando Relacionamentos...</span>
                </div>
            ) : filteredClients.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-20 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[3rem] bg-black/5">
                    <Building2 className="w-16 h-16 text-slate-300 mb-6 opacity-20"/>
                    <h3 className="text-xl font-black text-slate-400">Nenhum cliente associado.</h3>
                    <p className="text-sm text-slate-500 font-bold mt-2">Os clientes da sua organização aparecerão aqui.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 overflow-y-auto custom-scrollbar pb-20 px-1">
                    {filteredClients.map(client => (
                        <div key={client.id} className="glass-card p-10 rounded-[3.5rem] border border-slate-200 dark:border-white/5 hover:border-amber-500/30 transition-all group flex flex-col justify-between h-[420px] relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-current opacity-[0.03] rounded-full -mr-20 -mt-20 blur-3xl group-hover:opacity-[0.07] transition-opacity"></div>
                            
                            <div>
                                <div className="flex justify-between items-start mb-10">
                                    <div className="w-20 h-20 rounded-[2rem] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 overflow-hidden flex items-center justify-center shadow-ios transition-transform group-hover:scale-110">
                                        {client.logo_url ? <img src={client.logo_url} className="w-full h-full object-cover"/> : <Building2 className="w-10 h-10 text-slate-400"/>}
                                    </div>
                                    <div className="flex flex-col items-end gap-3">
                                        <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${onlineUsers.includes(client.id) ? 'bg-emerald-500 text-white border-emerald-400 shadow-glow-emerald animate-pulse' : 'bg-slate-100 dark:bg-white/5 text-slate-400 border-slate-200 dark:border-white/10'}`}>
                                            {onlineUsers.includes(client.id) ? 'Online' : 'Offline'}
                                        </div>
                                        <button className="p-3 bg-white dark:bg-white/5 text-slate-400 hover:text-amber-500 rounded-2xl border border-slate-100 dark:border-white/5 transition-all"><Edit className="w-4 h-4"/></button>
                                    </div>
                                </div>

                                <h3 className="text-3xl font-black text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors leading-tight tracking-tighter truncate">{client.nome}</h3>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{client.email}</span>
                                </div>

                                <div className="flex gap-4 mt-8">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                                        <TrendingUp className="w-3.5 h-3.5 text-blue-500"/> {client.status || 'Ativo'}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                                        <Zap className="w-3.5 h-3.5 text-amber-500"/> {client.numcolaboradores || 1} Colabs
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 mt-8 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                                <div>
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Fee Operacional</div>
                                    <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                                        <span className="text-sm mr-1 opacity-50 font-bold uppercase tracking-normal">R$</span>
                                        {client.valormensal?.toLocaleString('pt-BR', {minimumFractionDigits: 0})}
                                    </div>
                                </div>
                                <button className="w-16 h-16 rounded-[1.8rem] bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-black transition-all shadow-xl active:scale-90">
                                    <ArrowUpRight className="w-8 h-8"/>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
