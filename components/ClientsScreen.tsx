
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
        const data = await fetchClients(organizationId!);
        setClients(data);
        setIsLoading(false);
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
                    <button className="px-8 py-3.5 bg-white dark:bg-white text-black dark:text-black rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-amber-500 transition-all shadow-soft active:scale-95">
                        <Plus className="w-4 h-4"/> NOVO CLIENTE
                    </button>
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
                            {/* Decorative Background Blob */}
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
        </div>
    );
};
