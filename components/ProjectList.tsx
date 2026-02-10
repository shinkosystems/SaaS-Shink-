
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Opportunity } from '../types';
import { 
    Search, Target, ArrowRight, 
    Briefcase, DollarSign, ChevronRight,
    Wallet, X, Activity, ShieldCheck, TrendingUp,
    Plus, CreditCard, Ticket, Sparkles, Filter, 
    Cpu, Info, Settings, Layout, ChevronDown,
    SortAsc, SortDesc, ArrowUpDown, Check
} from 'lucide-react';

interface Props {
  opportunities: Opportunity[];
  onOpenProject: (opp: Opportunity) => void;
  userRole?: string;
  organizationId?: number;
  onOpenCreate?: () => void;
  initialFilterStatus?: string;
  onRefresh?: () => void;
}

type SortMode = 'prio' | 'mrr-desc' | 'mrr-asc' | 'alpha-asc' | 'alpha-desc';

export const ProjectList: React.FC<Props> = ({ opportunities = [], onOpenProject, userRole, onOpenCreate, initialFilterStatus }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>(initialFilterStatus || 'All');
  const [sortMode, setSortMode] = useState<SortMode>('prio');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [flippedCardId, setFlippedCardId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const filteredOpps = useMemo(() => {
      if (!Array.isArray(opportunities)) return [];
      
      let result = opportunities.filter(opp => {
          if (!opp) return false;
          const title = (opp.title || '').toLowerCase();
          const id = String(opp.id || '').toLowerCase();
          const search = searchTerm.toLowerCase();
          
          const matchesSearch = title.includes(search) || id.includes(search);
          const matchesStatus = filterStatus === 'All' || opp.status === filterStatus;
          return matchesSearch && matchesStatus;
      });

      result.sort((a, b) => {
          switch (sortMode) {
              case 'mrr-desc':
                  return (Number(b.mrr) || 0) - (Number(a.mrr) || 0);
              case 'mrr-asc':
                  return (Number(a.mrr) || 0) - (Number(b.mrr) || 0);
              case 'alpha-asc':
                  return (a.title || '').localeCompare(b.title || '');
              case 'alpha-desc':
                  return (b.title || '').localeCompare(a.title || '');
              default:
                  // Prioridade: Ativos primeiro, depois Score
                  if (a.status === 'Active' && b.status !== 'Active') return -1;
                  if (a.status !== 'Active' && b.status === 'Active') return 1;
                  return (b.prioScore || 0) - (a.prioScore || 0);
          }
      });

      return result;
  }, [opportunities, searchTerm, filterStatus, sortMode]);

  const getAssetStyle = (opp: Opportunity) => {
      if (opp.status === 'Active') {
          return {
              type: 'card',
              bg: opp.color || '#F59E0B',
              text: 'text-white',
              sub: 'text-white/70'
          };
      }
      return {
          type: 'ticket',
          bg: 'bg-white dark:bg-[#1a1a1e]',
          text: 'text-slate-900 dark:text-white',
          sub: 'text-slate-500 dark:text-slate-400'
      };
  };

  const handleBackgroundClick = () => {
      setExpandedCardId(null);
      setFlippedCardId(null);
      setIsMenuOpen(false);
  };

  const CARD_HEADER_OFFSET = 85;
  const EXPANDED_HEIGHT = 460;

  const containerHeight = useMemo(() => {
      if (filteredOpps.length === 0) return 400;
      const baseStackHeight = (filteredOpps.length - 1) * CARD_HEADER_OFFSET + 280;
      return expandedCardId ? baseStackHeight + (EXPANDED_HEIGHT - 120) : baseStackHeight;
  }, [filteredOpps.length, expandedCardId]);

  const sortOptions = [
    { id: 'prio', label: 'Prioridade (Padrão)' },
    { id: 'mrr-desc', label: 'Ticket (Maior p/ Menor)' },
    { id: 'mrr-asc', label: 'Ticket (Menor p/ Maior)' },
    { id: 'alpha-asc', label: 'Ordem Alfabética (A-Z)' },
    { id: 'alpha-desc', label: 'Ordem Alfabética (Z-A)' },
  ];

  const statusFilters = [
    { id: 'All', label: 'Todos os Status' },
    { id: 'Active', label: 'Ativos (Performance)' },
    { id: 'Future', label: 'Backlog (Valoração)' },
  ];

  return (
    <div 
        className="w-full min-h-screen animate-in fade-in duration-700 pb-40 select-none"
        onClick={handleBackgroundClick}
    >
        <div className="max-w-4xl mx-auto px-4 md:px-0">
            {/* Header Local da Carteira */}
            <header className="flex justify-between items-end mb-10 pt-6" onClick={e => e.stopPropagation()}>
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white">Carteira.</h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-2">Patrimônio de Ativos Shinkō</p>
                </div>
                <div className="flex gap-2 relative">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onOpenCreate?.(); }}
                        className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-900 dark:text-white hover:bg-amber-500 hover:text-black transition-all shadow-sm active:scale-90"
                    >
                        <Plus className="w-5 h-5"/>
                    </button>
                    
                    <div ref={menuRef} className="relative">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all shadow-sm active:scale-90 ${isMenuOpen ? 'bg-slate-900 text-white dark:bg-white dark:text-black' : 'bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            <Filter className="w-5 h-5"/>
                        </button>

                        {/* MENU FLUTUANTE (POPOVER) */}
                        {isMenuOpen && (
                            <div className="absolute right-0 mt-3 w-72 glass-panel bg-white/90 dark:bg-[#0a0a0c]/95 border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-2xl z-[500] p-6 animate-in zoom-in-95 duration-200 origin-top-right">
                                <div className="space-y-6">
                                    {/* Ordenação */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                                            <ArrowUpDown className="w-3 h-3"/> Ordenar Por
                                        </div>
                                        <div className="space-y-1">
                                            {sortOptions.map(opt => (
                                                <button 
                                                    key={opt.id}
                                                    onClick={() => { setSortMode(opt.id as SortMode); setIsMenuOpen(false); }}
                                                    className={`w-full text-left px-4 py-3 rounded-xl text-xs transition-all flex items-center justify-between group ${sortMode === opt.id ? 'bg-amber-500 text-black font-black' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 font-bold'}`}
                                                >
                                                    {opt.label}
                                                    {sortMode === opt.id && <Check className="w-4 h-4"/>}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="h-px bg-slate-100 dark:bg-white/5"></div>

                                    {/* Filtragem de Status */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                                            <Activity className="w-3 h-3"/> Filtrar Status
                                        </div>
                                        <div className="space-y-1">
                                            {statusFilters.map(opt => (
                                                <button 
                                                    key={opt.id}
                                                    onClick={() => { setFilterStatus(opt.id); setIsMenuOpen(false); }}
                                                    className={`w-full text-left px-4 py-3 rounded-xl text-xs transition-all flex items-center justify-between group ${filterStatus === opt.id ? 'bg-slate-900 text-white dark:bg-white dark:text-black font-black' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 font-bold'}`}
                                                >
                                                    {opt.label}
                                                    {filterStatus === opt.id && <Check className="w-4 h-4"/>}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Busca Local */}
            <div className="mb-12" onClick={e => e.stopPropagation()}>
                <div className="relative group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-amber-500 transition-colors"/>
                    <input 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Buscar em seus ativos..."
                        className="w-full bg-slate-100 dark:bg-white/[0.04] border border-transparent dark:border-white/5 rounded-[1.8rem] py-5 pl-14 pr-6 text-base font-bold outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/20 transition-all text-slate-900 dark:text-white shadow-inner"
                    />
                </div>
            </div>

            {/* Container da Pilha com Perspectiva 3D */}
            <div 
                className="relative transition-all duration-700 ease-in-out" 
                style={{ minHeight: `${containerHeight}px`, perspective: '2000px' }}
            >
                {filteredOpps.map((opp, idx) => {
                    const isExpanded = expandedCardId === opp.id;
                    const isFlipped = flippedCardId === opp.id;
                    const style = getAssetStyle(opp);
                    const isTicket = style.type === 'ticket';
                    const expandedIdx = filteredOpps.findIndex(o => o.id === expandedCardId);
                    
                    let translateY = idx * CARD_HEADER_OFFSET;
                    if (expandedCardId && idx > expandedIdx) {
                        translateY += (EXPANDED_HEIGHT - CARD_HEADER_OFFSET - 40);
                    }

                    return (
                        <div 
                            key={opp.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (isExpanded) {
                                    setFlippedCardId(isFlipped ? null : opp.id);
                                } else {
                                    setExpandedCardId(opp.id);
                                    setFlippedCardId(null);
                                }
                            }}
                            className={`
                                w-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer absolute top-0 left-0
                                ${isExpanded ? 'scale-[1.02]' : 'hover:-translate-y-2'}
                            `}
                            style={{
                                transform: `translateY(${translateY}px)`,
                                zIndex: isExpanded ? 100 : idx + 10,
                                transformStyle: 'preserve-3d'
                            }}
                        >
                            {/* O "CONTAINER" DO CARTÃO QUE GIRA */}
                            <div 
                                className={`
                                    relative w-full transition-transform duration-[800ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]
                                    ${isFlipped ? 'rotate-y-180' : ''}
                                `}
                                style={{ 
                                    transformStyle: 'preserve-3d',
                                    height: isExpanded ? `${EXPANDED_HEIGHT}px` : '180px'
                                }}
                            >
                                
                                {/* LADO A: FRENTE DO CARTÃO */}
                                <div 
                                    className={`
                                        absolute inset-0 w-full rounded-[2.5rem] shadow-2xl overflow-hidden p-8 md:p-10 flex flex-col border border-white/10 transition-all duration-500 backface-hidden
                                        ${isTicket ? 'bg-white dark:bg-[#1a1a1e] border-slate-200 dark:border-white/5' : ''}
                                    `}
                                    style={{ 
                                        backgroundColor: !isTicket ? (opp.color || '#F59E0B') : undefined,
                                        backfaceVisibility: 'hidden',
                                        WebkitBackfaceVisibility: 'hidden',
                                        transform: 'translateZ(1px)',
                                        opacity: 1
                                    }}
                                >
                                    {!isTicket && (
                                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/20 to-transparent opacity-40 pointer-events-none"></div>
                                    )}

                                    <div className="flex justify-between items-start relative z-10 mb-6 gap-4">
                                        <div className="space-y-1 min-w-0 flex-1">
                                            <div className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] ${style.sub}`}>
                                                {isTicket ? <Ticket className="w-3 h-3"/> : <CreditCard className="w-3 h-3"/>}
                                                {opp.archetype}
                                            </div>
                                            <h3 className={`text-xl md:text-2xl font-black tracking-tighter ${style.text} truncate`}>{opp.title}</h3>
                                        </div>
                                        <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border shrink-0 ${isTicket ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-white/10 text-white border-white/20'}`}>
                                            {isTicket ? 'Backlog' : 'Performance'}
                                        </div>
                                    </div>

                                    <div className="flex-1 flex flex-col justify-end">
                                        <div className="flex justify-between items-end relative z-10">
                                            <div>
                                                <div className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${style.sub}`}>Yield Mensal</div>
                                                <div className={`text-2xl md:text-3xl font-black ${style.text}`}>
                                                    <span className="text-sm font-bold mr-1 opacity-50">R$</span>
                                                    {(Number(opp.mrr) || 0).toLocaleString('pt-BR')}
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${style.sub}`}>PRIO-6 SCORE</div>
                                                <div className={`text-2xl font-black ${isTicket ? 'text-amber-500' : 'text-white'}`}>{(opp.prioScore || 0).toFixed(1)}</div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {isExpanded && !isFlipped && (
                                        <div className="mt-8 pt-4 border-t border-white/10 flex justify-center items-center animate-pulse shrink-0">
                                            <span className={`text-[8px] font-black uppercase tracking-[0.4em] ${style.sub}`}>Clique para ver o verso</span>
                                        </div>
                                    )}
                                </div>

                                {/* LADO B: VERSO DO CARTÃO */}
                                <div 
                                    className={`
                                        absolute inset-0 w-full rounded-[2.5rem] shadow-2xl p-10 flex flex-col rotate-y-180 backface-hidden border border-white/20 bg-[#0a0a0b]
                                    `}
                                    style={{ 
                                        transform: 'rotateY(180deg) translateZ(1px)',
                                        backfaceVisibility: 'hidden',
                                        WebkitBackfaceVisibility: 'hidden',
                                        opacity: 1
                                    }}
                                >
                                    <div className="flex justify-between items-center mb-8 relative z-20">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-amber-500/10 rounded-lg">
                                                <Cpu className="w-5 h-5 text-amber-500"/>
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Dados de Engenharia</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-5 bg-white/5 rounded flex items-center justify-center border border-white/10">
                                                <div className="w-4 h-2.5 bg-amber-500/40 rounded-sm"></div>
                                            </div>
                                            <span className="text-[8px] font-bold text-slate-600 uppercase">v2.6</span>
                                        </div>
                                    </div>

                                    <div className="mb-8 relative z-20">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onOpenProject(opp); }}
                                            className="w-full py-5 rounded-[1.8rem] bg-white text-black font-black text-[11px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 hover:bg-amber-500 shadow-glow-white active:scale-95 group"
                                        >
                                            Abrir Ativo <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1"/>
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-10 mb-8 relative z-20 flex-1">
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Indicadores Shinkō</h4>
                                            <div className="space-y-3">
                                                {[
                                                    { label: 'Velocidade', val: opp.velocity },
                                                    { label: 'Viabilidade', val: opp.viability },
                                                    { label: 'Retorno', val: opp.revenue }
                                                ].map(item => (
                                                    <div key={item.label} className="flex flex-col gap-1.5">
                                                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                            <span>{item.label}</span>
                                                            <span className="text-amber-500">{item.val || 1}/5</span>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            {[1,2,3,4,5].map(v => (
                                                                <div key={v} className={`h-1 flex-1 rounded-full transition-all duration-500 ${v <= (item.val || 1) ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]' : 'bg-white/5'}`}></div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-6">
                                            <div className="space-y-3">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Saúde Técnica</h4>
                                                <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Activity className="w-3.5 h-3.5 text-emerald-500"/>
                                                        <span className="text-[9px] font-black uppercase text-slate-400">Status</span>
                                                    </div>
                                                    <span className="text-xs font-black text-emerald-500">92%</span>
                                                </div>
                                            </div>

                                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-[9px] text-slate-500 leading-relaxed font-medium italic text-center">
                                                Ativo otimizado para {(opp.prioScore || 0) > 40 ? 'Alta Performance' : 'Estabilidade'}.
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-auto text-center relative z-20 opacity-40">
                                        <span className="text-[8px] font-black uppercase tracking-[0.5em] text-slate-600">Shinkō Systems Global</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {filteredOpps.length === 0 && (
                    <div className="py-40 text-center border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[3rem] opacity-30 w-full">
                        <Wallet className="w-16 h-16 mx-auto mb-4 text-slate-300"/>
                        <p className="text-xs font-black uppercase tracking-[0.4em]">Carteira de ativos vazia</p>
                    </div>
                )}
            </div>
        </div>

        {/* Global CSS Inject for the Flip effect */}
        <style>{`
            .rotate-y-180 { transform: rotateY(180deg); }
            .backface-hidden { backface-visibility: hidden !important; -webkit-backface-visibility: hidden !important; }
            .shadow-glow-amber { box-shadow: 0 0 10px rgba(245, 158, 11, 0.4); }
            .shadow-glow-white { box-shadow: 0 0 20px rgba(255, 255, 255, 0.2); }
        `}</style>
    </div>
  );
};
