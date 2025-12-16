
import React, { useState, useEffect, useRef } from 'react';
import { 
    ArrowRight, Sparkles, Play, 
    Zap, Target, BrainCircuit, ShieldCheck, 
    Check, ChevronRight, BarChart3, Layers,
    Terminal, GitBranch, MessageSquare, Users,
    Globe, Lock, Cpu, DollarSign, Activity, Send,
    Settings, LayoutGrid, Calendar, TrendingUp, Code2, Palette, GanttChartSquare, Briefcase
} from 'lucide-react';
import { CasesGallery } from './CasesGallery';

interface Props {
  onEnter: () => void;
  onOpenBlog?: () => void;
  customName?: string;
  customLogo?: string | null;
  customColor?: string;
}

const LOGO_URL = "https://zjssfnbcboibqeoubeou.supabase.co/storage/v1/object/public/fotoperfil/fotoperfil/1%20(1).png";

export const LandingPage: React.FC<Props> = ({ onEnter, onOpenBlog, customName, customLogo }) => {
  const [showCases, setShowCases] = useState(false);
  const brandName = customName || "Shinkō OS";
  const displayLogo = customLogo || LOGO_URL;

  // --- MODULAR PRICING STATE ---
  const [billingCycle, setBillingCycle] = useState<'monthly'|'yearly'>('monthly');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [userCount, setUserCount] = useState(5); // Default to Studio tier

  const getBasePlan = (users: number) => {
      // Matches IDs in public.planos
      if (users === 1) return { name: 'Core Solo', price: 89.90 };
      if (users <= 5) return { name: 'Core Studio', price: 297.90 };
      return { name: 'Core Scale', price: 899.90 };
  };

  const currentBase = getBasePlan(userCount);
  
  // Matches IDs in public.modulos (23-28) + Prices
  const AVAILABLE_MODULES = [
      { id: 'gantt', label: 'Cronograma Gantt', price: 29.90, icon: GanttChartSquare, desc: 'Linha do tempo visual e dependências.' },
      { id: 'financial', label: 'Gestão Financeira', price: 39.90, icon: DollarSign, desc: 'Fluxo de caixa, DRE e emissão de notas.' },
      { id: 'crm', label: 'CRM de Vendas', price: 49.90, icon: TrendingUp, desc: 'Pipeline visual e gestão de contatos.' },
      { id: 'ia', label: 'Shinkō Guru AI', price: 59.90, icon: BrainCircuit, desc: 'Seu CTO Virtual para estratégia e escopo.' },
      { id: 'engineering', label: 'Engenharia (DORA)', price: 69.90, icon: Code2, desc: 'Métricas de elite para times de dev.' },
      { id: 'whitelabel', label: 'White Label', price: 1500.00, icon: Palette, desc: 'Personalize a plataforma com sua marca e cores.' }
  ];

  const INCLUDED_FEATURES = [
      { label: 'Gestão de Projetos', icon: Briefcase },
      { label: 'Kanban Ilimitado', icon: LayoutGrid },
      { label: 'Matriz RDE (Priorização)', icon: Target },
      { label: 'T.A.D.S. (Validação)', icon: ShieldCheck }
  ];

  const toggleModule = (id: string) => {
      setSelectedModules(prev => 
          prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
      );
  };

  const calculateTotal = () => {
      const modulesTotal = selectedModules.reduce((acc, modId) => {
          const mod = AVAILABLE_MODULES.find(m => m.id === modId);
          return acc + (mod ? mod.price : 0);
      }, 0);
      
      const totalMonthly = currentBase.price + modulesTotal;
      
      if (billingCycle === 'yearly') {
          return totalMonthly * 0.8; // 20% discount
      }
      return totalMonthly;
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

      {/* --- BACKGROUND ENGINE --- */}
      <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[120px] mix-blend-screen animate-pulse"></div>
          <div className="absolute bottom-[10%] right-[10%] w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[120px] mix-blend-screen animate-pulse animation-delay-2000"></div>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04]"></div>
          {/* Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      </div>

      {/* --- HEADER --- */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b border-white/5 bg-[#020202]/80">
          <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.scrollTo(0, 0)}>
                <img src={displayLogo} alt={brandName} className="h-8 w-auto object-contain relative z-10" />
            </div>
            
            <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400 mr-4">
                    <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-white transition-colors">Home</button>
                    <button onClick={() => setShowCases(true)} className="hover:text-white transition-colors">Cases</button>
                    {onOpenBlog && <button onClick={onOpenBlog} className="hover:text-white transition-colors">Blog</button>}
                </div>
                <button onClick={onEnter} className="group relative px-6 py-2.5 bg-white text-black font-bold text-sm rounded-full hover:bg-slate-200 transition-all shadow-glow-white overflow-hidden">
                    <span className="relative z-10 flex items-center gap-2">Entrar <ArrowRight className="w-4 h-4"/></span>
                </button>
            </div>
          </div>
      </nav>

      <main className="relative z-10 flex flex-col items-center">
          
          {/* --- HERO SECTION --- */}
          <section className="w-full min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20 relative">
            <div className="max-w-5xl mx-auto relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <Sparkles className="w-3 h-3"/> Framework v2.5 Liberado
                </div>

                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-8 tracking-tighter leading-[0.95] text-white animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
                    Engenharia de <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600">Resultados Reais</span>.
                </h1>

                <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed font-light animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                    O sistema operacional que substitui "achismos" por <strong>dados</strong>. 
                    Integre <span className="text-white font-medium">Estratégia</span>, <span className="text-white font-medium">Dev</span> e <span className="text-white font-medium">Financeiro</span> em um único fluxo contínuo.
                </p>

                <div className="flex flex-col sm:flex-row justify-center gap-6 animate-in fade-in zoom-in duration-500 delay-300">
                    <button onClick={onEnter} className="px-10 py-5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-lg rounded-full flex items-center justify-center gap-3 transition-all hover:scale-105 shadow-[0_0_50px_-10px_rgba(245,158,11,0.4)]">
                        Começar Agora
                    </button>
                    {onOpenBlog && (
                        <button onClick={onOpenBlog} className="px-10 py-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-lg rounded-full flex items-center justify-center gap-3 transition-all hover:scale-105 backdrop-blur-md">
                            <Layers className="w-5 h-5"/> Ler Artigos
                        </button>
                    )}
                </div>
            </div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-50">
                <div className="w-6 h-10 border-2 border-white/20 rounded-full flex justify-center pt-2">
                    <div className="w-1 h-2 bg-white/50 rounded-full"></div>
                </div>
            </div>
          </section>

          {/* --- SECTION 1: MATRIZ RDE (THE BRAIN) --- */}
          <section id="method" className="w-full py-32 border-t border-white/5 bg-[#050505] relative overflow-hidden">
              <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                  
                  <div className="order-2 lg:order-1 relative">
                      {/* Abstract Matrix Visualization */}
                      <div className="aspect-square rounded-3xl bg-gradient-to-br from-slate-900 to-black border border-white/10 relative overflow-hidden shadow-2xl group">
                          {/* Grid Lines */}
                          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:50px_50px]"></div>
                          
                          {/* Quadrants */}
                          <div className="absolute top-4 left-4 text-emerald-500 text-xs font-bold uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded">Sprints (Atacar)</div>
                          <div className="absolute bottom-4 right-4 text-red-500 text-xs font-bold uppercase tracking-widest bg-red-500/10 px-2 py-1 rounded">Descarte</div>
                          
                          {/* Animated Dots */}
                          <div className="absolute top-[25%] left-[70%] w-6 h-6 bg-emerald-500 rounded-full shadow-[0_0_30px_rgba(16,185,129,0.6)] animate-pulse flex items-center justify-center z-20 cursor-pointer hover:scale-125 transition-transform">
                              <div className="absolute -top-8 bg-slate-800 text-white text-[10px] px-2 py-1 rounded border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">Projeto Alpha (9.8)</div>
                          </div>
                          
                          <div className="absolute top-[60%] left-[30%] w-4 h-4 bg-amber-500 rounded-full opacity-60 shadow-[0_0_20px_rgba(245,158,11,0.4)]"></div>
                          <div className="absolute bottom-[20%] left-[20%] w-3 h-3 bg-red-600 rounded-full opacity-40"></div>
                          <div className="absolute top-[40%] right-[20%] w-5 h-5 bg-blue-500 rounded-full opacity-70"></div>

                          {/* Radar Scan Effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent w-[200%] h-full -skew-x-12 animate-[shimmer_5s_infinite]"></div>
                      </div>
                  </div>

                  <div className="order-1 lg:order-2 space-y-8">
                      <div className="inline-flex items-center gap-2 text-amber-500 font-bold uppercase tracking-widest text-xs">
                          <Target className="w-4 h-4"/> O Cérebro
                      </div>
                      <h2 className="text-4xl md:text-6xl font-black text-white leading-tight">
                          Matriz RDE™ <br/>
                          <span className="text-slate-500">Decisões, não opiniões.</span>
                      </h2>
                      <p className="text-lg text-slate-400 leading-relaxed">
                          Pare de priorizar baseado em quem grita mais alto. Nosso algoritmo exclusivo cruza 
                          <strong> Receita</strong>, <strong>Dor Técnica</strong> e <strong>Esforço</strong> para gerar um Score de Prioridade matemático.
                      </p>
                      <ul className="space-y-4">
                          <li className="flex items-start gap-3">
                              <div className="p-1 bg-emerald-500/10 rounded-full text-emerald-500 mt-1"><Check className="w-4 h-4"/></div>
                              <div>
                                  <strong className="text-white block">Priorização Automática</strong>
                                  <span className="text-sm text-slate-500">O sistema ordena o backlog pelo maior ROI.</span>
                              </div>
                          </li>
                          <li className="flex items-start gap-3">
                              <div className="p-1 bg-emerald-500/10 rounded-full text-emerald-500 mt-1"><Check className="w-4 h-4"/></div>
                              <div>
                                  <strong className="text-white block">Clareza Visual</strong>
                                  <span className="text-sm text-slate-500">Identifique gargalos e oportunidades de ouro em segundos.</span>
                              </div>
                          </li>
                      </ul>
                  </div>

              </div>
          </section>

          {/* --- SECTION 2: AI CHAT (THE ENGINE) --- */}
          <section id="ai" className="w-full py-32 bg-[#020202] relative">
              {/* Glow Behind */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-900/10 rounded-full blur-[150px] pointer-events-none"></div>

              <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                  
                  <div className="space-y-8">
                      <div className="inline-flex items-center gap-2 text-purple-500 font-bold uppercase tracking-widest text-xs">
                          <BrainCircuit className="w-4 h-4"/> O Motor
                      </div>
                      <h2 className="text-4xl md:text-6xl font-black text-white leading-tight">
                          Shinkō Guru AI. <br/>
                          <span className="text-slate-500">Seu CTO Virtual.</span>
                      </h2>
                      <p className="text-lg text-slate-400 leading-relaxed">
                          Não sabe por onde começar? Converse com o Guru. Ele estrutura projetos, 
                          sugere cronogramas e cria tarefas técnicas automaticamente.
                      </p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                              <Zap className="w-6 h-6 text-amber-500 mb-3"/>
                              <h4 className="font-bold text-white mb-1">Geração de Escopo</h4>
                              <p className="text-xs text-slate-500">De uma ideia vaga para um plano executável.</p>
                          </div>
                          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                              <ShieldCheck className="w-6 h-6 text-purple-500 mb-3"/>
                              <h4 className="font-bold text-white mb-1">Validação T.A.D.S.</h4>
                              <p className="text-xs text-slate-500">Análise de risco e viabilidade técnica automática.</p>
                          </div>
                      </div>
                  </div>

                  <div className="relative">
                      {/* Chat Window Simulation */}
                      <div className="rounded-3xl bg-[#0a0a0a] border border-white/10 shadow-2xl overflow-hidden relative z-10 flex flex-col h-[500px]">
                          {/* Chat Header */}
                          <div className="bg-[#121212] px-6 py-4 flex items-center justify-between border-b border-white/5">
                              <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center relative">
                                      <BrainCircuit className="w-5 h-5 text-white"/>
                                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-[#121212] rounded-full"></div>
                                  </div>
                                  <div>
                                      <div className="font-bold text-sm text-white">Shinkō Guru AI</div>
                                      <div className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">Online</div>
                                  </div>
                              </div>
                              <div className="flex gap-2">
                                  <div className="w-2 h-2 rounded-full bg-white/20"></div>
                                  <div className="w-2 h-2 rounded-full bg-white/20"></div>
                              </div>
                          </div>
                          
                          {/* Chat Body */}
                          <div className="flex-1 p-6 space-y-6 overflow-hidden relative">
                              {/* Background Pattern */}
                              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>

                              {/* Message 1: User */}
                              <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">
                                  <div className="bg-purple-600 text-white p-4 rounded-2xl rounded-tr-none max-w-[80%] shadow-lg">
                                      <p className="text-sm">Quero criar um SaaS de Delivery Vertical. Por onde começo?</p>
                                  </div>
                              </div>

                              {/* Message 2: AI */}
                              <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-500 delay-1000">
                                  <div className="bg-[#1a1a1a] border border-white/10 text-slate-300 p-4 rounded-2xl rounded-tl-none max-w-[85%] shadow-lg">
                                      <p className="text-sm mb-3">
                                          Ótima escolha! Para um <strong>SaaS Vertical</strong>, precisamos focar em nicho. Sugiro começarmos com:
                                      </p>
                                      <div className="space-y-2">
                                          <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/5">
                                              <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-xs font-bold">1</div>
                                              <span className="text-xs">Definição do Nicho (Farmácias ou Petshops)</span>
                                          </div>
                                          <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/5">
                                              <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-xs font-bold">2</div>
                                              <span className="text-xs">MVP: App do Entregador + Painel Web</span>
                                          </div>
                                      </div>
                                      <p className="text-sm mt-3 text-slate-400">Quer que eu gere o cronograma técnico?</p>
                                  </div>
                              </div>

                              {/* Message 3: User */}
                              <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-500 delay-2000">
                                  <div className="bg-purple-600 text-white p-4 rounded-2xl rounded-tr-none max-w-[80%] shadow-lg">
                                      <p className="text-sm">Sim, por favor!</p>
                                  </div>
                              </div>

                              {/* Typing Indicator */}
                              <div className="flex justify-start animate-in fade-in duration-500 delay-3000">
                                  <div className="bg-[#1a1a1a] border border-white/10 p-4 rounded-2xl rounded-tl-none flex gap-1 items-center">
                                      <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div>
                                      <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-150"></div>
                                      <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-300"></div>
                                  </div>
                              </div>
                          </div>

                          {/* Input Area */}
                          <div className="p-4 border-t border-white/10 bg-[#121212]">
                              <div className="relative">
                                  <input disabled type="text" placeholder="Digite sua ideia..." className="w-full bg-[#050505] border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm text-slate-400 focus:outline-none cursor-not-allowed"/>
                                  <button className="absolute right-2 top-2 p-1.5 bg-purple-600 rounded-lg text-white opacity-50 cursor-not-allowed">
                                      <Send className="w-4 h-4"/>
                                  </button>
                              </div>
                          </div>
                      </div>
                      
                      {/* Decorative Elements */}
                      <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-purple-600 rounded-full blur-[80px] opacity-40"></div>
                  </div>

              </div>
          </section>

          {/* --- SECTION 3: FULL CYCLE (THE OS) --- */}
          <section className="w-full py-32 bg-[#050505] border-t border-white/5 relative">
              <div className="max-w-7xl mx-auto px-6 text-center">
                  <div className="inline-flex items-center gap-2 text-blue-500 font-bold uppercase tracking-widest text-xs mb-6">
                      <Layers className="w-4 h-4"/> Ecossistema Completo
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black text-white mb-6">
                      Do Lead ao <span className="text-emerald-500">Caixa</span>.
                  </h2>
                  <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-16">
                      Pare de usar 5 ferramentas diferentes. O Shinkō conecta o CRM, a Gestão de Projetos e o Financeiro.
                      Quando você fecha um negócio, o projeto nasce e o contrato é gerado.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                      {/* Connecting Line (Desktop) */}
                      <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-emerald-500/20 z-0"></div>

                      <div className="relative z-10 bg-[#0a0a0a] p-8 rounded-3xl border border-white/5 hover:border-blue-500/30 transition-colors group">
                          <div className="w-16 h-16 mx-auto bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                              <Users className="w-8 h-8 text-blue-500"/>
                          </div>
                          <h3 className="text-xl font-bold text-white mb-2">1. CRM & Vendas</h3>
                          <p className="text-sm text-slate-500">Pipeline de vendas integrado. Converta leads em clientes com contratos automáticos.</p>
                      </div>

                      <div className="relative z-10 bg-[#0a0a0a] p-8 rounded-3xl border border-white/5 hover:border-purple-500/30 transition-colors group">
                          <div className="w-16 h-16 mx-auto bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                              <GitBranch className="w-8 h-8 text-purple-500"/>
                          </div>
                          <h3 className="text-xl font-bold text-white mb-2">2. Engenharia</h3>
                          <p className="text-sm text-slate-500">Kanban, Gantt e Métricas DORA. Gestão de tasks conectada ao escopo vendido.</p>
                      </div>

                      <div className="relative z-10 bg-[#0a0a0a] p-8 rounded-3xl border border-white/5 hover:border-emerald-500/30 transition-colors group">
                          <div className="w-16 h-16 mx-auto bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                              <DollarSign className="w-8 h-8 text-emerald-500"/>
                          </div>
                          <h3 className="text-xl font-bold text-white mb-2">3. Financeiro</h3>
                          <p className="text-sm text-slate-500">Controle de MRR, fluxo de caixa e emissão de notas. Tudo vinculado ao projeto.</p>
                      </div>
                  </div>
              </div>
          </section>

          {/* --- SECTION 4: PRICING CALCULATOR (MODULAR) --- */}
          <section id="calculator" className="w-full py-32 bg-[#020202] relative border-t border-white/5">
              <div className="max-w-5xl mx-auto px-6">
                  
                  <div className="text-center mb-16">
                      <div className="inline-flex items-center gap-2 text-white border border-white/20 px-4 py-1.5 rounded-full font-bold uppercase tracking-widest text-xs mb-6">
                          <Activity className="w-4 h-4"/> Monte seu Plano
                      </div>
                      <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
                          Pague apenas pelo que <span className="text-amber-500">Usar</span>.
                      </h2>
                      <p className="text-slate-400">
                          Base sólida com gestão de projetos completa. O valor base adapta-se ao tamanho do seu time.
                      </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
                      
                      {/* Left: Configuration */}
                      <div className="space-y-8">
                          
                          {/* Core Package with Users Slider */}
                          <div className="bg-[#0a0a0a] border border-amber-500/30 rounded-2xl p-6 relative overflow-hidden">
                              <div className="absolute top-0 right-0 bg-amber-500 text-black text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">Incluso</div>
                              <h3 className="text-xl font-bold text-white mb-1">Shinkō Core</h3>
                              <p className="text-slate-400 text-sm mb-6">A base para qualquer operação.</p>
                              
                              <div className="mb-6 bg-white/5 p-4 rounded-xl border border-white/5">
                                  <div className="flex justify-between items-center mb-4">
                                      <span className="text-sm font-bold text-white flex items-center gap-2">
                                          <Users className="w-4 h-4 text-amber-500"/> Tamanho da Equipe
                                      </span>
                                      <span className="text-amber-500 font-bold text-lg">{userCount} usuários</span>
                                  </div>
                                  <input 
                                      type="range" min="1" max="15" step="1" 
                                      value={userCount} onChange={(e) => setUserCount(Number(e.target.value))}
                                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500 mb-2"
                                  />
                                  <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase">
                                      <span>Solo (1)</span>
                                      <span>Studio (5)</span>
                                      <span>Scale (15)</span>
                                  </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {INCLUDED_FEATURES.map((feat, i) => (
                                      <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                                          <div className="p-1 rounded bg-white/10"><feat.icon className="w-3 h-3 text-white"/></div>
                                          {feat.label}
                                      </div>
                                  ))}
                              </div>
                          </div>

                          {/* Add-ons */}
                          <div>
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Adicione Poder (Módulos)</h4>
                              <div className="grid grid-cols-1 gap-3">
                                  {AVAILABLE_MODULES.map(mod => {
                                      const isSelected = selectedModules.includes(mod.id);
                                      return (
                                          <div 
                                              key={mod.id}
                                              onClick={() => toggleModule(mod.id)}
                                              className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between group ${isSelected ? 'bg-white/10 border-white/30' : 'bg-[#0a0a0a] border-white/5 hover:border-white/10'}`}
                                          >
                                              <div className="flex items-center gap-4">
                                                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-white text-black' : 'bg-white/5 text-slate-400 group-hover:text-white'}`}>
                                                      <mod.icon className="w-5 h-5"/>
                                                  </div>
                                                  <div>
                                                      <div className="font-bold text-white text-sm">{mod.label}</div>
                                                      <div className="text-xs text-slate-500">{mod.desc}</div>
                                                  </div>
                                              </div>
                                              <div className="text-right">
                                                  <div className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-slate-500'}`}>+ R$ {mod.price.toFixed(2)}</div>
                                                  {isSelected && <Check className="w-4 h-4 text-emerald-500 ml-auto mt-1"/>}
                                              </div>
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>

                      </div>

                      {/* Right: Receipt */}
                      <div className="lg:sticky lg:top-24">
                          <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
                              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none"></div>
                              
                              <div className="flex justify-center mb-8">
                                  <div className="bg-white/5 p-1 rounded-xl flex w-full max-w-xs">
                                      <button 
                                          onClick={() => setBillingCycle('monthly')}
                                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${billingCycle === 'monthly' ? 'bg-white text-black shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                      >
                                          Mensal
                                      </button>
                                      <button 
                                          onClick={() => setBillingCycle('yearly')}
                                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all relative ${billingCycle === 'yearly' ? 'bg-white text-black shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                      >
                                          Anual <span className="text-emerald-500 ml-1">-20%</span>
                                      </button>
                                  </div>
                              </div>

                              <div className="space-y-4 mb-8">
                                  <div className="flex justify-between text-sm">
                                      <span className="text-slate-300 flex items-center gap-2">
                                          {currentBase.name} <span className="text-xs bg-white/10 px-1.5 rounded text-slate-400">{userCount} users</span>
                                      </span>
                                      <span className="font-bold text-white">R$ {currentBase.price.toFixed(2)}</span>
                                  </div>
                                  {selectedModules.map(modId => {
                                      const mod = AVAILABLE_MODULES.find(m => m.id === modId);
                                      return (
                                          <div key={modId} className="flex justify-between text-sm animate-in slide-in-from-left-2">
                                              <span className="text-slate-400 flex items-center gap-2"><div className="w-1 h-1 bg-amber-500 rounded-full"></div> {mod?.label}</span>
                                              <span className="font-bold text-white">+ R$ {mod?.price.toFixed(2)}</span>
                                          </div>
                                      );
                                  })}
                                  <div className="h-px bg-white/10 my-4"></div>
                                  <div className="flex justify-between items-end">
                                      <span className="text-slate-300 font-bold">Total Mensal</span>
                                      <div className="text-right">
                                          <div className="text-4xl font-black text-white">
                                              R$ {calculateTotal().toFixed(2)}
                                          </div>
                                          {billingCycle === 'yearly' && (
                                              <div className="text-xs text-emerald-500 font-bold mt-1">
                                                  Cobrado anualmente (R$ {(calculateTotal() * 12).toFixed(2)})
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              </div>

                              <button onClick={onEnter} className="w-full py-4 bg-white hover:bg-slate-200 text-black font-bold rounded-xl shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]">
                                  Começar Agora
                              </button>
                              <p className="text-xs text-center text-slate-500 mt-4">
                                  7 dias grátis. Cancele quando quiser.
                              </p>
                          </div>
                      </div>

                  </div>
              </div>
          </section>

          {/* --- FOOTER CTA --- */}
          <section className="w-full py-24 border-t border-white/5 bg-gradient-to-b from-[#020202] to-[#0a0a0a] text-center px-6">
              <div className="max-w-2xl mx-auto">
                  <h2 className="text-4xl font-bold text-white mb-6">Pronto para organizar o caos?</h2>
                  <p className="text-slate-400 mb-10">Junte-se a engenheiros e gestores que estão construindo o futuro com dados, não palpites.</p>
                  <button onClick={onEnter} className="px-12 py-4 bg-white text-black font-bold text-lg rounded-full hover:bg-slate-200 transition-all shadow-xl">
                      Acessar Shinkō OS
                  </button>
              </div>
          </section>

          {/* --- FOOTER LINKS --- */}
          <footer className="w-full border-t border-white/5 bg-[#020202] py-16 px-6">
              <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                  <div className="flex flex-col items-start gap-4">
                      <div className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity cursor-default">
                          <img src={displayLogo} alt="Shinko" className="h-6 w-auto grayscale brightness-200" />
                          <span className="font-bold text-sm text-white">Shinkō OS</span>
                      </div>
                      <p className="text-slate-600 text-xs text-left max-w-xs">
                          Designed for high-performance engineering teams and venture builders.
                      </p>
                  </div>
                  
                  <div className="flex gap-8 text-sm text-slate-500">
                      <button className="hover:text-white transition-colors">Manifesto</button>
                      <button className="hover:text-white transition-colors">Pricing</button>
                      <button onClick={onEnter} className="hover:text-white transition-colors">Login</button>
                  </div>

                  <p className="text-slate-700 text-xs">
                      © 2025 Shinkō Framework.
                  </p>
              </div>
          </footer>
      </main>
    </div>
  );
};
