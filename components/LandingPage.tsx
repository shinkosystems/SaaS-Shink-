
import React, { useState, useEffect } from 'react';
import { 
    ArrowRight, Sparkles, Target, BrainCircuit, ShieldCheck, 
    Check, ChevronRight, BarChart3, Layers, Code2, Palette, 
    GanttChartSquare, Briefcase, Plus, DollarSign, LayoutGrid,
    TrendingUp, Zap, MousePointer2, Smartphone, Shield, Activity,
    Gauge, Search, Terminal, Workflow
} from 'lucide-react';
import { CasesGallery } from './CasesGallery';

interface Props {
  onEnter: () => void;
  onOpenBlog?: () => void;
  customName?: string;
  customLogo?: string | null;
}

const LOGO_URL = "https://zjssfnbcboibqeoubeou.supabase.co/storage/v1/object/public/fotoperfil/fotoperfil/1%20(1).png";

export const LandingPage: React.FC<Props> = ({ onEnter, onOpenBlog, customName, customLogo }) => {
  const [showCases, setShowCases] = useState(false);
  const brandName = customName || "Shinkō OS";
  const displayLogo = customLogo || LOGO_URL;

  const [billingCycle, setBillingCycle] = useState<'monthly'|'yearly'>('monthly');
  const [selectedModules, setSelectedModules] = useState<string[]>(['projects', 'kanban']);
  const [userCount, setUserCount] = useState(5); 

  const getBasePlan = (users: number) => {
      if (users === 1) return { name: 'Core Solo', price: 89.90, id: 'solo' };
      if (users <= 5) return { name: 'Core Studio', price: 297.90, id: 'studio' };
      if (users <= 15) return { name: 'Core Scale', price: 899.90, id: 'scale' };
      return { name: 'Enterprise', price: 6500.00, id: 'enterprise' };
  };

  const currentBase = getBasePlan(userCount);
  
  const AVAILABLE_MODULES = [
      { id: 'projects', label: 'Gestão de Projetos', price: 0, icon: Briefcase, desc: 'Portfólio e lista de ativos.', core: true },
      { id: 'kanban', label: 'Kanban Board', price: 0, icon: LayoutGrid, desc: 'Fluxo visual de tarefas.', core: true },
      { id: 'gantt', label: 'Cronograma Gantt', price: 29.90, icon: GanttChartSquare, desc: 'Linha do tempo e dependências.' },
      { id: 'financial', label: 'Gestão Financeira', price: 39.90, icon: DollarSign, desc: 'Fluxo de caixa e MRR.' },
      { id: 'crm', label: 'CRM de Vendas', price: 49.90, icon: TrendingUp, desc: 'Pipeline e prospecção ativa.' },
      { id: 'ia', label: 'Shinkō Guru AI', price: 59.90, icon: BrainCircuit, desc: 'Análise de viabilidade via IA.' },
      { id: 'engineering', label: 'Engenharia (DORA)', price: 69.90, icon: Code2, desc: 'Métricas de elite de dev.' },
      { id: 'whitelabel', label: 'White Label', price: 1500.00, icon: Palette, desc: 'Personalização total da marca.' }
  ];

  const toggleModule = (id: string) => {
      const mod = AVAILABLE_MODULES.find(m => m.id === id);
      if (mod?.core) return;
      setSelectedModules(prev => 
          prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
      );
  };

  const calculateTotal = () => {
      const modulesTotal = selectedModules.reduce((acc, modId) => {
          const mod = AVAILABLE_MODULES.find(m => m.id === modId);
          if (mod?.core) return acc;
          return acc + (mod ? mod.price : 0);
      }, 0);
      const totalMonthly = currentBase.price + modulesTotal;
      return billingCycle === 'yearly' ? totalMonthly * 0.8 : totalMonthly;
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#020202] text-white overflow-y-auto scroll-smooth custom-scrollbar selection:bg-amber-500 selection:text-black font-sans">
      
      {showCases && (
        <CasesGallery 
            onClose={() => setShowCases(false)} 
            onOpenBlog={onOpenBlog} 
            onEnter={onEnter} 
        />
      )}

      <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[120px] mix-blend-screen animate-pulse"></div>
          <div className="absolute bottom-[10%] right-[10%] w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[120px] mix-blend-screen animate-pulse animation-delay-2000"></div>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04]"></div>
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      </div>

      <nav className="fixed top-0 left-0 right-0 z-[100] backdrop-blur-md border-b border-white/5 bg-[#020202]/80 h-16 md:h-20">
          <div className="max-w-7xl mx-auto px-6 h-full flex justify-between items-center">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.scrollTo(0, 0)}>
                <img src={displayLogo} alt={brandName} className="h-8 md:h-10 w-auto object-contain transition-transform hover:scale-105" />
            </div>
            
            <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-8 text-[11px] font-black uppercase tracking-widest text-slate-400 mr-4">
                    <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-white transition-colors">Home</button>
                    <button onClick={() => setShowCases(true)} className="hover:text-white transition-colors">Cases</button>
                    {onOpenBlog && <button onClick={onOpenBlog} className="hover:text-white transition-colors">Insights</button>}
                </div>
                <button onClick={onEnter} className="group relative px-6 py-2.5 bg-white text-black font-black text-xs rounded-full hover:bg-slate-200 transition-all shadow-glow-white overflow-hidden active:scale-95">
                    <span className="relative z-10 flex items-center gap-2">Entrar <ArrowRight className="w-4 h-4"/></span>
                </button>
            </div>
          </div>
      </nav>

      <main className="relative z-10 flex flex-col items-center">
          <section className="w-full min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-12 relative overflow-hidden">
            <div className="max-w-5xl mx-auto relative z-10">
                <div className="mb-12 animate-in fade-in zoom-in duration-1000">
                    <img src={displayLogo} alt="Logo Shinko" className="h-32 md:h-48 lg:h-56 w-auto object-contain mx-auto drop-shadow-[0_0_50px_rgba(245,158,11,0.2)]" />
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.3em] text-amber-500 mb-8">
                    <Sparkles className="w-3.5 h-3.5"/> Framework Shinkō OS v2.5.4
                </div>
                <h1 className="text-5xl md:text-7xl lg:text-9xl font-black mb-8 tracking-tighter leading-[0.9] text-white hero-title">
                    Inovação com <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600">Precisão Industrial</span>.
                </h1>
                <p className="text-lg md:text-xl lg:text-2xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed font-medium px-4">
                    O sistema operacional que substitui o "feeling" pela <strong>matemática</strong>. 
                    Mapeie, priorize e escale seus ativos digitais com o framework de elite.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4 md:gap-6">
                    <button onClick={onEnter} className="px-10 py-5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 transition-all hover:scale-105 shadow-[0_0_60px_-15px_rgba(245,158,11,0.6)] active:scale-95">
                        Acessar Workspace
                    </button>
                    {onOpenBlog && (
                        <button onClick={onOpenBlog} className="px-10 py-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 transition-all hover:scale-105 backdrop-blur-md">
                            <Layers className="w-5 h-5"/> Ler Framework
                        </button>
                    )}
                </div>
            </div>
          </section>

          <section className="w-full py-32 md:py-48 bg-[#020202] px-6">
              <div className="max-w-7xl mx-auto space-y-24">
                  <div className="text-center space-y-4">
                      <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-white">Pilares de <span className="text-amber-500">Engenharia</span>.</h2>
                      <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto font-medium">Arquitetura sistemática para validação e escala de produtos digitais.</p>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                      <div className="flex flex-col gap-8 group">
                          <div className="aspect-[4/5] rounded-[3.5rem] bg-gradient-to-br from-slate-900 to-black border border-white/10 relative overflow-hidden shadow-2xl p-10 flex flex-col items-center justify-center gap-6 group-hover:border-amber-500/30 transition-all duration-500">
                              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:30px_30px]"></div>
                              <div className="relative w-32 h-32 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-glow-amber animate-pulse">
                                  <Target className="w-16 h-16 text-amber-500"/>
                              </div>
                              <div className="relative text-center">
                                  <div className="text-6xl font-black text-white tracking-tighter">9.8</div>
                                  <div className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em] mt-2">Score PRIO-6™</div>
                              </div>
                          </div>
                          <div className="space-y-4 px-4">
                              <h3 className="text-3xl font-black text-white tracking-tighter">Matriz <span className="text-amber-500">RDE</span>.</h3>
                              <p className="text-slate-400 font-medium leading-relaxed">Algoritmo de priorização que elimina o "achismo" técnico cruzando Receita e Dor.</p>
                          </div>
                      </div>

                      <div className="flex flex-col gap-8 group">
                          <div className="aspect-[4/5] rounded-[3.5rem] bg-gradient-to-br from-slate-900 to-black border border-white/10 relative overflow-hidden shadow-2xl p-10 flex flex-col items-center justify-center gap-6 group-hover:border-purple-500/30 transition-all duration-500">
                              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:30px_30px]"></div>
                              <div className="relative w-32 h-32 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-glow-purple">
                                  <ShieldCheck className="w-16 h-16 text-purple-500"/>
                              </div>
                              <div className="relative text-center">
                                  <div className="text-6xl font-black text-white tracking-tighter">V.2</div>
                                  <div className="text-[10px] font-black text-purple-500 uppercase tracking-[0.4em] mt-2">Crivo T.A.D.S.</div>
                              </div>
                          </div>
                          <div className="space-y-4 px-4">
                              <h3 className="text-3xl font-black text-white tracking-tighter">Filtro <span className="text-purple-500">Sistêmico</span>.</h3>
                              <p className="text-slate-400 font-medium leading-relaxed">Validação de escalabilidade e dor real antes da primeira linha de código ser escrita.</p>
                          </div>
                      </div>

                      <div className="flex flex-col gap-8 group">
                          <div className="aspect-[4/5] rounded-[3.5rem] bg-gradient-to-br from-slate-900 to-black border border-white/10 relative overflow-hidden shadow-2xl p-10 flex flex-col items-center justify-center gap-6 group-hover:border-blue-500/30 transition-all duration-500">
                              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:30px_30px]"></div>
                              <div className="relative w-32 h-32 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-glow-blue">
                                  <Code2 className="w-16 h-16 text-blue-500"/>
                              </div>
                              <div className="relative text-center">
                                  <div className="text-6xl font-black text-white tracking-tighter">ELITE</div>
                                  <div className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mt-2">DORA Metrics</div>
                              </div>
                          </div>
                          <div className="space-y-4 px-4">
                              <h3 className="text-3xl font-black text-white tracking-tighter">Alta <span className="text-blue-500">Performance</span>.</h3>
                              <p className="text-slate-400 font-medium leading-relaxed">Métricas de elite de engenharia integradas nativamente na gestão de produto.</p>
                          </div>
                      </div>
                  </div>
              </div>
          </section>

          <section className="w-full py-24 md:py-48 border-t border-white/5 bg-[#050505] overflow-hidden">
              <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
                  <div className="relative">
                      <div className="aspect-square rounded-[4rem] bg-gradient-to-br from-slate-900 to-black border border-white/10 relative overflow-hidden shadow-2xl p-12 group">
                          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px]"></div>
                          <div className="relative h-full w-full border border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center gap-6 bg-black/40 backdrop-blur-sm group-hover:border-amber-500/30 transition-colors">
                              <div className="w-40 h-40 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center animate-pulse">
                                  <Target className="w-20 h-20 text-amber-500"/>
                              </div>
                              <div className="text-center">
                                  <div className="text-7xl font-black text-white tracking-tighter">9.8</div>
                                  <div className="text-xs font-black text-amber-500 uppercase tracking-[0.4em] mt-3">Score PRIO-6</div>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="space-y-10">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-black uppercase tracking-widest text-amber-500">Mapeamento de Valor</div>
                      <h2 className="text-5xl md:text-7xl font-black text-white leading-tight tracking-tighter">Decisões baseadas em <span className="text-amber-500">Matemática</span>.</h2>
                      <p className="text-xl text-slate-400 leading-relaxed font-medium">O framework Shinkō elimina o achismo técnico. Cada oportunidade é processada por nosso algoritmo de priorização.</p>
                  </div>
              </div>
          </section>

          <section className="w-full py-24 md:py-48 bg-[#020202] px-6 relative overflow-hidden">
              <div className="max-w-7xl mx-auto relative z-10">
                  <div className="text-center mb-24 space-y-4">
                      <h2 className="text-5xl md:text-8xl font-black tracking-tighter leading-none">Investimento <span className="text-amber-500">Modular</span>.</h2>
                      <p className="text-slate-400 text-xl max-w-2xl mx-auto font-medium">Pague apenas pela infraestrutura que seu time realmente utiliza.</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
                      <div className="lg:col-span-7 space-y-12">
                          <div className="glass-panel p-10 rounded-[3rem] border border-white/10 bg-black/40 space-y-8">
                              <div className="flex justify-between items-center">
                                  <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Tamanho da Operação</span>
                                  <span className="text-3xl font-black text-white">{userCount} {userCount === 1 ? 'usuário' : 'usuários'}</span>
                              </div>
                              <input type="range" min="1" max="30" step="1" value={userCount} onChange={e => setUserCount(parseInt(e.target.value))} className="w-full h-2.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-amber-500" />
                          </div>

                          <div className="space-y-6">
                              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 ml-4">Módulos de Engenharia</h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {AVAILABLE_MODULES.map(mod => (
                                      <button key={mod.id} onClick={() => toggleModule(mod.id)} className={`p-6 md:p-8 rounded-[2rem] border text-left transition-all group relative overflow-hidden flex items-center gap-5 ${selectedModules.includes(mod.id) ? 'bg-amber-500 border-amber-400 text-black shadow-glow-amber' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}>
                                          <div className={`p-4 rounded-2xl ${selectedModules.includes(mod.id) ? 'bg-black/10' : 'bg-white/5 text-slate-500'}`}>
                                              <mod.icon className="w-6 h-6"/>
                                          </div>
                                          <div className="flex-1">
                                              <div className="font-black text-xs uppercase tracking-widest mb-1">{mod.label}</div>
                                              <div className={`text-[10px] font-bold leading-tight ${selectedModules.includes(mod.id) ? 'text-black/70' : 'text-slate-500'}`}>{mod.desc}</div>
                                          </div>
                                      </button>
                                  ))}
                              </div>
                          </div>
                      </div>

                      <div className="lg:col-span-5 sticky top-32">
                          <div className="bg-white p-12 rounded-[4rem] text-black shadow-2xl space-y-12 relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                              <div className="pt-10 border-t border-slate-100 flex flex-col items-center">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Investimento Consolidado</span>
                                  <div className="text-7xl font-black text-black tracking-tighter mt-3 flex items-baseline">
                                      <span className="text-2xl mr-2">R$</span>{calculateTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </div>
                              </div>
                              <button onClick={onEnter} className="w-full py-7 bg-black text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4">
                                  Contratar Workspace <ArrowRight className="w-6 h-6"/>
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </section>

          <section className="w-full py-48 border-t border-white/5 bg-[#020202] text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(245,158,11,0.1),transparent_70%)]"></div>
              <div className="max-w-4xl mx-auto space-y-12 px-6 relative z-10">
                <h2 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9]">Mude para a <br/><span className="text-amber-500">Engenharia de Valor</span>.</h2>
                <button onClick={onEnter} className="px-14 py-6 bg-white text-black font-black uppercase tracking-[0.3em] text-xs rounded-full shadow-[0_0_80px_rgba(255,255,255,0.2)] hover:scale-110 active:scale-95 transition-all">
                    Criar Workspace Agora
                </button>
              </div>
          </section>

          <footer className="w-full border-t border-white/5 bg-[#020202] py-24 px-6 relative z-10">
              <div className="max-w-7xl mx-auto text-center space-y-16">
                  <img src={displayLogo} alt="Shinkō" className="h-12 w-auto mx-auto grayscale opacity-40 hover:opacity-100 transition-opacity" />
                  <div className="flex justify-center gap-12 text-[10px] font-black uppercase tracking-[0.4em] text-slate-600">
                      <button className="hover:text-white transition-colors">Termos de Uso</button>
                      <button className="hover:text-white transition-colors">Privacidade</button>
                      <button className="hover:text-white transition-colors">Framework 2.5</button>
                  </div>
              </div>
          </footer>
      </main>
    </div>
  );
};
