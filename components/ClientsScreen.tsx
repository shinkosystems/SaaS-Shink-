
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
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[9px] font-bold text-blue-400 uppercase tracking-widest">
                        <Users className="w-3 h-3"/> Gestão de Stakeholders
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                        Base de <span className="text-amber-500 font-extrabold">Parceiros.</span>
                    </h1>
                    <p className="text-[#A1A1AA] font-bold uppercase tracking-widest text-[10px] mt-2">Ativos e Contratos Vinculados</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                    <div className="relative flex-1 sm:w-72">
                        <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-500"/>
                        <input 
                            type="text" 
                            placeholder="Buscar parceiro..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white/5 border border-[#333] rounded-xl text-sm text-white outline-none focus:border-amber-500/50 transition-all"
                        />
                    </div>
                    <button className="px-6 py-3 bg-white text-black rounded-xl font-bold text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-amber-500 transition-all">
                        <Plus className="w-4 h-4"/> Novo Cliente
                    </button>
                </div>
            </div>

            {/* Grid de Ativos */}
            {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-400">
                    <Loader2 className="w-10 h-10 animate-spin text-amber-500"/>
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#A1A1AA]">Sincronizando Relacionamentos...</span>
                </div>
            ) : filteredClients.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-16 border border-dashed border-[#333] rounded-2xl">
                    <Building2 className="w-12 h-12 text-slate-800 mb-4"/>
                    <h3 className="text-lg font-bold text-slate-500">Nenhum parceiro associado.</h3>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
                    {filteredClients.map(client => (
                        <div key={client.id} className="glass-card p-8 rounded-2xl border border-[#333] flex flex-col justify-between h-96 transition-all group">
                            <div>
                                <div className="flex justify-between items-start mb-8">
                                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-[#333] overflow-hidden flex items-center justify-center">
                                        {client.logo_url ? <img src={client.logo_url} className="w-full h-full object-cover"/> : <Building2 className="w-8 h-8 text-slate-700"/>}
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <div className={`px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest border ${onlineUsers.includes(client.id) ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-white/5 text-[#A1A1AA] border-[#333]'}`}>
                                            {onlineUsers.includes(client.id) ? 'Online' : 'Offline'}
                                        </div>
                                    </div>
                                </div>

                                <h3 className="text-2xl font-bold text-white group-hover:text-amber-500 transition-colors leading-tight tracking-tight truncate">{client.nome}</h3>
                                <div className="text-[11px] font-medium text-[#A1A1AA] mt-1 truncate">{client.email}</div>

                                <div className="flex gap-3 mt-6">
                                    <div className="text-[9px] font-bold text-[#A1A1AA] uppercase tracking-widest px-2.5 py-1 rounded-lg border border-[#333]">
                                        {client.status || 'Ativo'}
                                    </div>
                                    <div className="text-[9px] font-bold text-[#A1A1AA] uppercase tracking-widest px-2.5 py-1 rounded-lg border border-[#333]">
                                        {client.numcolaboradores || 1} Time
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 mt-6 border-t border-[#333] flex items-center justify-between">
                                <div>
                                    <div className="text-[9px] font-bold text-[#A1A1AA] uppercase tracking-wider mb-1">Fee Operacional</div>
                                    <div className="text-2xl font-bold text-white tracking-tight">
                                        <span className="text-xs mr-1 text-[#A1A1AA]">R$</span>
                                        {client.valormensal?.toLocaleString('pt-BR', {minimumFractionDigits: 0})}
                                    </div>
                                </div>
                                <button className="w-12 h-12 rounded-xl border border-[#333] hover:bg-white hover:text-black flex items-center justify-center transition-all">
                                    <ArrowUpRight className="w-6 h-6"/>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
