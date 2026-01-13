
import React, { useState } from 'react';
import { Opportunity, Archetype } from '../types';
import { 
    Search, Filter, LayoutGrid, Zap, Target, ArrowRight, 
    Briefcase, GanttChartSquare, Plus, Trash2, List, 
    DollarSign, ChevronRight, Info, AlertCircle, Ban 
} from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

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
          case 'Active': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
          case 'Negotiation': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
          case 'Future': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
          default: return 'text-slate-500 bg-slate-100 border-slate-200';
      }
  };

  const renderValue = (opp: Opportunity) => {
      if (opp.archetype === Archetype.INTERNAL_MARKETING) {
          return (
              <div className="flex flex-col items-end">
                <span className="font-black text-slate-400 flex items-center gap-1.5">
                    <Ban className="w-3 h-3"/> INTERNO
                </span>
                <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">Centro de Custo</span>
              </div>
          );
      }

      // Fixed: Using correct mrr property from Opportunity interface
      const realMrr = Number(opp.mrr || 0);
      if (realMrr > 0) {
          return (
              <div className="flex flex-col items-end">
                <span className="font-black text-emerald-500">
                    R$ {realMrr.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                </span>
                <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">Recorrência Mensal</span>
              </div>
          );
      }
      // Projeção baseada no Score RDE (Revenue 1-5) -> 1 ponto = R$ 2k MRR
      const projectedMrr = (Number(opp.revenue || 1) * 2000);
      return (
          <div className="flex flex-col items-end">
              <span className="font-black text-amber-500/60 text-xs">
                  ~ R$ {projectedMrr.toLocaleString('pt-BR')}
              </span>
              <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">Projeção via Score</span>
          </div>
      );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700 pb-32">
        {/* Header Estratégico */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                    Portfólio de <span className="text-amber-500">Ativos</span>.
                </h1>
                <p className="text-slate-500 dark:text-[#A1A1AA] font-bold uppercase tracking-widest text-[10px] mt-4 flex items-center gap-2">
                    <Zap className="w-3 h-3 text-amber-500"/> Pipeline de Engenharia e Valor Recorrente
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10 shadow-inner">
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-white/10 shadow-sm text-amber-500' : 'text-slate-400'}`}><LayoutGrid className="w-4 h-4"/></button>
                    <button onClick={() => setViewMode('table')} className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white dark:bg-white/10 shadow-sm text-amber-500' : 'text-slate-400'}`}><List className="w-4 h-4"/></button>
                </div>

                <div className="relative flex-1 md:w-64">
                    <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
                    <input 
                        type="text" 
                        placeholder="Buscar por ID ou Nome..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-[#333] rounded-2xl text-sm font-bold outline-none focus:border-amber-500 transition-all shadow-sm"
                    />
                </div>

                {onOpenCreate && (
                    <button onClick={onOpenCreate} className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-xl active:scale-95 flex items-center gap-2">
                        <Plus className="w-4 h-4"/> Novo Ativo
                    </button>
                )}
            </div>
        </div>

        {/* Listagem em GRID */}
        {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredOpps.map(opp => (
                    <div 
                        key={opp.id}
                        onClick={() => onOpenProject(opp)}
                        className="bg-white dark:bg-slate-900 p-8 flex flex-col justify-between min-h-[300px] cursor-pointer group relative rounded-[2.5rem] border border-slate-100 dark:border-white/5 hover:border-amber-500/30 transition-all hover:shadow-2xl hover:-translate-y-1"
                    >
                        {userRole !== 'cliente' && (
                            <button 
                                type="button"
                                onClick={(e) => handleDelete(e, opp.id)}
                                className="absolute top-6 right-6 p-2 text-slate-300 hover:text-red-500 transition-all z-10 opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 className="w-4 h-4"/>
                            </button>
                        )}

                        <div>
                            <div className="flex justify-between items-start mb-8">
                                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${getStatusColor(opp.status)}`}>
                                    {opp.status}
                                </span>
                                <div className="text-[10px] font-black text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                                    {opp.prioScore.toFixed(1)}
                                </div>
                            </div>

                            <h3 className="text-xl font-black text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors leading-tight mb-3 tracking-tighter">
                                {opp.title}
                            </h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-3 font-medium leading-relaxed">
                                {opp.description || "Iniciativa sem contexto estratégico definido."}
                            </p>
                        </div>

                        <div className="pt-6 mt-8 border-t border-slate-50 dark:border-white/5 flex items-end justify-between">
                            <div className="space-y-1">
                                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                    <DollarSign className="w-2.5 h-2.5"/> MRR Alvo
                                </div>
                                <div className="text-sm font-black text-slate-900 dark:text-white">
                                    {renderValue(opp)}
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-black transition-all">
                                <ArrowRight className="w-4 h-4"/>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            /* Listagem em TABELA (Classic Spreadsheet View) */
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 overflow-hidden shadow-soft overflow-x-auto custom-scrollbar">
                <table className="w-full text-left table-auto">
                    <thead className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/10">
                        <tr>
                            <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Ativo / Projeto</th>
                            <th className="px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Status</th>
                            <th className="px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">RDE PRIO</th>
                            <th className="px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">T.A.D.S</th>
                            <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">MRR (Mensal)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                        {filteredOpps.map(opp => (
                            <tr key={opp.id} onClick={() => onOpenProject(opp)} className="group hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-all cursor-pointer">
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-1.5 h-6 bg-amber-500/20 rounded-full group-hover:bg-amber-500 transition-all"></div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-amber-500">{opp.title}</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{opp.archetype}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-5 text-center">
                                    <span className={`px-2.5 py-1 rounded-[6px] text-[8px] font-black uppercase tracking-tighter border inline-block ${getStatusColor(opp.status)}`}>
                                        {opp.status}
                                    </span>
                                </td>
                                <td className="px-4 py-5 text-center">
                                    <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 font-mono">{opp.prioScore.toFixed(1)}</span>
                                </td>
                                <td className="px-4 py-5 text-center">
                                    <div className="flex justify-center gap-1">
                                        {Object.values(opp.tads).map((val, i) => (
                                            <div key={i} className={`w-1.5 h-1.5 rounded-full ${val ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-white/10'}`}></div>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    {renderValue(opp)}
                                </td>
                            </tr>
                        ))}
                        {filteredOpps.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-20 text-center opacity-30">
                                    <div className="flex flex-col items-center gap-4">
                                        <AlertCircle className="w-12 h-12"/>
                                        <span className="text-xs font-black uppercase tracking-widest">Nenhum ativo mapeado</span>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        )}
    </div>
  );
};
