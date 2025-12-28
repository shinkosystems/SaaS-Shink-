
import React, { useState } from 'react';
import { Opportunity } from '../types';
import { Search, Filter, LayoutGrid, Zap, Target, ArrowRight, Briefcase, GanttChartSquare, Plus, Trash2 } from 'lucide-react';
import { deleteOpportunity } from '../services/opportunityService';

interface Props {
  opportunities: Opportunity[];
  onOpenProject: (opp: Opportunity) => void;
  userRole?: string;
  organizationId?: number;
  onOpenCreate?: () => void;
  initialFilterStatus?: string;
  activeModules?: string[];
  onRefresh?: () => void;
}

export const ProjectList: React.FC<Props> = ({ opportunities, onOpenProject, userRole, onOpenCreate, initialFilterStatus, activeModules, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>(initialFilterStatus || 'All');

  const filteredOpps = opportunities.filter(opp => {
      const matchesSearch = opp.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'All' || opp.status === filterStatus;
      return matchesSearch && matchesStatus;
  });

  const handleDelete = async (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (confirm("Deseja realmente excluir este projeto? Esta ação é irreversível.")) {
          try {
              const success = await deleteOpportunity(id);
              if (success) {
                  if (onRefresh) onRefresh();
                  else window.location.reload();
              } else {
                  alert("Erro ao excluir projeto.");
              }
          } catch (err) {
              alert("Falha na comunicação com o banco.");
          }
      }
  };

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'Active': return 'bg-emerald-500';
          case 'Negotiation': return 'bg-blue-500';
          case 'Future': return 'bg-amber-500';
          default: return 'bg-slate-500';
      }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                    Portfólio de <span className="text-amber-500">Ativos.</span>
                </h1>
                <p className="text-slate-500 dark:text-[#A1A1AA] font-bold uppercase tracking-widest text-[10px] mt-2">Pipeline de Engenharia e Valor</p>
            </div>

            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                {onOpenCreate && (
                    <button onClick={onOpenCreate} className="px-6 py-3 bg-amber-500 text-black rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2">
                        <Plus className="w-4 h-4"/> Novo Projeto
                    </button>
                )}
                
                <div className="relative flex-1 md:w-64">
                    <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-500"/>
                    <input 
                        type="text" 
                        placeholder="Buscar ativo..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white/5 border border-slate-200 dark:border-[#333] rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:border-amber-500/50 transition-all"
                    />
                </div>
            </div>
        </div>

        {/* Grid Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
            {filteredOpps.map(opp => (
                <div 
                    key={opp.id}
                    onClick={() => onOpenProject(opp)}
                    className="glass-card p-8 flex flex-col justify-between min-h-[280px] cursor-pointer group relative rounded-2xl"
                >
                    {userRole !== 'cliente' && (
                        <button 
                            type="button"
                            onClick={(e) => handleDelete(e, opp.id)}
                            className="absolute top-4 right-4 p-2.5 text-red-500/50 hover:text-red-500 transition-all z-10"
                        >
                            <Trash2 className="w-4 h-4"/>
                        </button>
                    )}

                    <div>
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${getStatusColor(opp.status)}`}></div>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#A1A1AA]">{opp.status}</span>
                            </div>
                            <div className="text-[10px] font-bold text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                                {opp.prioScore.toFixed(1)}
                            </div>
                        </div>

                        <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors leading-tight mb-3">
                            {opp.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-[#A1A1AA] line-clamp-3 leading-relaxed">
                            {opp.description || "Iniciativa sem contexto estratégico definido."}
                        </p>
                    </div>

                    <div className="pt-6 mt-6 border-t border-slate-200 dark:border-[#333] flex items-center justify-between">
                        <div className="flex gap-4">
                            <div className="flex items-center gap-1.5 text-slate-500 dark:text-[#A1A1AA]">
                                <Zap className="w-3.5 h-3.5"/> <span className="text-xs font-bold">{opp.velocity}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-500 dark:text-[#A1A1AA]">
                                <Target className="w-3.5 h-3.5"/> <span className="text-xs font-bold">{opp.viability}</span>
                            </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-[#333] flex items-center justify-center group-hover:bg-amber-500 group-hover:text-black transition-all">
                            <ArrowRight className="w-4 h-4"/>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};
