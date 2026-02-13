
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Opportunity, ProjectStatus } from '../types';
import { Search, Plus, Filter, Briefcase, ChevronRight, ArrowUpRight, Target, Zap, Activity, ShieldCheck, X } from 'lucide-react';

interface Props {
  opportunities: Opportunity[];
  onOpenProject: (opp: Opportunity) => void;
  userRole: string;
  onRefresh: () => void;
  onOpenCreate?: () => void;
}

export const ProjectList: React.FC<Props> = ({ opportunities, onOpenProject, userRole, onOpenCreate }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');

    const filtered = useMemo(() => {
        return opportunities.filter(opp => {
            const matchesSearch = opp.title.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || opp.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [opportunities, searchTerm, statusFilter]);

    return (
        <div className="flex flex-col min-h-screen bg-white dark:bg-[#020203] pb-32">
            {/* Nubank-Style Header */}
            <div className="bg-[#F59E0B] -mx-4 md:-mx-12 px-8 pt-10 pb-8 md:px-12 md:pt-14 md:pb-12 mb-10 rounded-b-[3.5rem] shadow-xl relative z-50">
                <div className="max-w-7xl mx-auto flex flex-col gap-8">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/10">
                                <Briefcase className="w-5 h-5 text-white" />
                            </div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">Carteira.</h2>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={onOpenCreate} className="p-3 bg-white/20 rounded-2xl hover:bg-white/30 text-white transition-all border border-white/10">
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    
                    <div className="space-y-1">
                        <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white">
                            Patrimônio de Ativos Shinkō
                        </h2>
                        <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em]">Gestão de Portfólio Industrial</p>
                    </div>

                    {/* Search Integrated in Header Area */}
                    <div className="relative group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <input 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Buscar em seus ativos..."
                            className="w-full bg-white/10 border border-white/10 rounded-[2rem] p-6 pl-16 text-white placeholder:text-white/40 outline-none focus:bg-white/20 transition-all shadow-inner"
                        />
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto w-full px-4 md:px-0">
                {/* Filters */}
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-8 -mx-2 px-2">
                    {['all', 'Active', 'Future', 'Negotiation'].map((st) => (
                        <button
                            key={st}
                            onClick={() => setStatusFilter(st as any)}
                            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border whitespace-nowrap ${statusFilter === st ? 'bg-slate-900 dark:bg-white text-white dark:text-black border-transparent shadow-lg' : 'bg-white dark:bg-white/5 text-slate-400 border-slate-100 dark:border-white/5 hover:bg-slate-50'}`}
                        >
                            {st === 'all' ? 'Tudo' : st === 'Active' ? 'Execução' : st === 'Future' ? 'Backlog' : 'Negociação'}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filtered.map(opp => (
                        <div 
                            key={opp.id} 
                            onClick={() => onOpenProject(opp)}
                            className="group bg-white dark:bg-white/[0.02] p-10 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-soft hover:shadow-2xl transition-all relative overflow-hidden cursor-pointer active:scale-95 h-full flex flex-col justify-between"
                        >
                            <div className="absolute top-0 left-0 w-full h-1.5" style={{ backgroundColor: opp.color || '#F59E0B' }}></div>
                            
                            <div>
                                <div className="flex justify-between items-start mb-10">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                            <ShieldCheck className="w-3 h-3"/> {opp.archetype}
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight tracking-tighter truncate max-w-[200px]">{opp.title}</h3>
                                    </div>
                                    <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${opp.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
                                        {opp.status === 'Active' ? 'Performance' : 'Pipeline'}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-10 border-t border-slate-50 dark:border-white/5 flex items-end justify-between mt-auto">
                                <div className="space-y-1">
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">PRIO-6 SCORE</div>
                                    <div className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white">{opp.prioScore.toFixed(1)}</div>
                                </div>
                                <button className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 flex items-center justify-center transition-all group-hover:bg-[#F59E0B] group-hover:text-black group-hover:border-[#F59E0B]">
                                    <ArrowUpRight className="w-7 h-7" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {filtered.length === 0 && (
                    <div className="py-40 flex flex-col items-center justify-center text-center opacity-30 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[3.5rem]">
                        <Briefcase className="w-16 h-16 mb-4"/>
                        <p className="text-lg font-black uppercase tracking-widest">Nenhum ativo localizado</p>
                    </div>
                )}
            </div>
        </div>
    );
};
