
import React, { useState } from 'react';
import { Opportunity } from '../types';
import { Search, Filter, LayoutGrid, Zap, Target, ArrowRight, Briefcase, GanttChartSquare, Plus } from 'lucide-react';
import { GanttView } from './GanttView';

interface Props {
  opportunities: Opportunity[];
  onOpenProject: (opp: Opportunity) => void;
  userRole?: string;
  organizationId?: number;
  onOpenCreate?: () => void;
  initialFilterStatus?: string;
  activeModules?: string[];
}

export const ProjectList: React.FC<Props> = ({ opportunities, onOpenProject, userRole, onOpenCreate, initialFilterStatus, activeModules }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>(initialFilterStatus || 'All');

  const filteredOpps = opportunities.filter(opp => {
      const matchesSearch = opp.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'All' || opp.status === filterStatus;
      return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'Active': return 'bg-emerald-500';
          case 'Negotiation': return 'bg-blue-500';
          case 'Future': return 'bg-amber-500';
          default: return 'bg-slate-500';
      }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white leading-none tracking-tighter">
                    Portfólio de <span className="text-amber-500">Ativos</span>.
                </h1>
                <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-3">Pipeline de Engenharia e Valor</p>
            </div>

            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                {onOpenCreate && userRole !== 'cliente' && (
                    <button onClick={onOpenCreate} className="px-8 py-4 bg-amber-500 text-black rounded-[1.5rem] font-black text-xs uppercase tracking-widest shinko-button shadow-glow-amber flex items-center gap-2">
                        <Plus className="w-4 h-4"/> Novo Projeto
                    </button>
                )}
                
                <div className="relative flex-1 md:w-64">
                    <Search className="w-4 h-4 absolute left-4 top-4 text-slate-400"/>
                    <input 
                        type="text" 
                        placeholder="Buscar ativo..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[1.5rem] text-sm text-slate-900 dark:text-white outline-none focus:border-amber-500/50 transition-all shadow-sm"
                    />
                </div>
            </div>
        </div>

        {/* Grid Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
            {filteredOpps.map(opp => (
                <div 
                    key={opp.id}
                    onClick={() => onOpenProject(opp)}
                    className="glass-card p-10 flex flex-col justify-between min-h-[300px] cursor-pointer group"
                >
                    <div>
                        <div className="flex justify-between items-start mb-8">
                            <div className="flex items-center gap-3">
                                <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(opp.status)} shadow-[0_0_10px] shadow-current`}></div>
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{opp.status}</span>
                            </div>
                            <div className="text-[10px] font-black text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
                                {opp.prioScore.toFixed(1)}
                            </div>
                        </div>

                        <h3 className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors leading-none tracking-tight mb-4">
                            {opp.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-500 line-clamp-3 leading-relaxed font-bold">
                            {opp.description || "Iniciativa sem contexto estratégico definido."}
                        </p>
                    </div>

                    <div className="pt-8 mt-8 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                        <div className="flex gap-6">
                            <div className="flex items-center gap-2 text-slate-400">
                                <Zap className="w-4 h-4 text-amber-500/50"/> <span className="text-xs font-black">{opp.velocity}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                                <Target className="w-4 h-4 text-blue-500/50"/> <span className="text-xs font-black">{opp.viability}</span>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-black transition-all">
                            <ArrowRight className="w-5 h-5"/>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};
