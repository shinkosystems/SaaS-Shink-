
import React, { useState, useEffect } from 'react';
import { 
    ArrowRight, Sparkles, Play, LayoutGrid, 
    Zap, Target, BrainCircuit, ShieldCheck, 
    Check, ChevronRight, BarChart3, Layers,
    Terminal, GitBranch, MessageSquare, Users
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

  // Bento Item Component for reusability
  const BentoItem = ({ title, desc, icon: Icon, colSpan = "col-span-1", children }: any) => (
      <div className={`${colSpan} group relative overflow-hidden rounded-3xl border border-white/10 bg-[#0A0A0A] p-8 hover:border-amber-500/30 transition-all duration-500 hover:shadow-2xl hover:shadow-amber-900/10 flex flex-col`}>
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <div className="relative z-10 mb-6">
              <div className="mb-4 inline-flex p-3 rounded-2xl bg-white/5 border border-white/10 text-amber-500 group-hover:scale-110 transition-transform duration-500 group-hover:bg-amber-500 group-hover:text-black shadow-lg">
                  <Icon className="w-6 h-6"/>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
          </div>
          
          <div className="relative z-10 mt-auto w-full">
            {children}
          </div>
      </div>
  );

  return (
    <div className="fixed inset-0 z-[200] bg-[#050505] text-white overflow-y-auto scroll-smooth custom-scrollbar selection:bg-amber-500 selection:text-black">
      
      {showCases && <CasesGallery onClose={() => setShowCases(false)} />}

      {/* --- BACKGROUND ENGINE --- */}
      <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[20%] w-[1000px] h-[1000px] bg-amber-600/10 rounded-full blur-[120px] animate-pulse mix-blend-screen"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-orange-600/5 rounded-full blur-[100px] mix-blend-screen"></div>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/80 to-[#050505]"></div>
      </div>

      {/* --- STANDARD HEADER --- */}
      <nav className="relative z-50 w-full px-6 py-6 sticky top-0 backdrop-blur-xl border-b border-white/5 bg-[#050505]/80">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.scrollTo(0, 0)}>
                <img src={displayLogo} alt={brandName} className="h-8 w-auto object-contain" />
            </div>
            
            <div className="flex items-center gap-6">
                <div className="hidden md:flex gap-1 p-1 bg-white/5 rounded-full border border-white/5 backdrop-blur-md">
                    <button onClick={() => setShowCases(true)} className="px-5 py-2 rounded-full text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 transition-all">Cases</button>
                    {onOpenBlog && <button onClick={onOpenBlog} className="px-5 py-2 rounded-full text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 transition-all">Insights</button>}
                </div>
                
                <button onClick={onEnter} className="group relative px-6 py-2.5 bg-white text-black font-bold text-sm rounded-xl hover:bg-slate-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] overflow-hidden">
                    <span className="relative z-10 flex items-center gap-2">Entrar <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform"/></span>
                </button>
            </div>
          </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <main className="relative z-10 w-full flex flex-col items-center">
          <section className="w-full max-w-7xl px-6 pt-24 pb-24 flex flex-col items-center text-center">
            
            <div className="mb-8 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-bold uppercase tracking-widest text-amber-500 animate-in fade-in slide-in-from-bottom-4 duration-700 shadow-glow">
                <Sparkles className="w-3 h-3"/> Engineering Innovation Framework 2.5
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-8 tracking-tighter leading-[1] text-white animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100 max-w-5xl mx-auto">
                Transforme Incerteza <br/> em <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Resultado Previsível</span>.
            </h1>

            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200 mx-auto">
                Integre estratégia, engenharia e financeiro em um único sistema operacional. 
                Deixe a IA calcular a viabilidade enquanto você foca na execução.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in zoom-in duration-500 delay-300">
                <button onClick={onEnter} className="px-8 py-4 bg-amber-500 hover:bg-amber-400 text-black font-bold text-lg rounded-full flex items-center justify-center gap-3 transition-all hover:-translate-y-1 shadow-[0_0_40px_-10px_rgba(245,158,11,0.5)]">
                    Começar Agora
                </button>
                <button onClick={onEnter} className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-lg rounded-full flex items-center justify-center gap-3 transition-all hover:-translate-y-1 backdrop-blur-md">
                    <Play className="w-5 h-5 fill-white"/> Ver Demonstração
                </button>
            </div>
          </section>

          {/* --- BENTO GRID FEATURES --- */}
          <section className="w-full max-w-7xl px-6 pb-32">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Card 1: Matrix RDE (Large) */}
                  <BentoItem 
                    title="Matriz RDE™" 
                    desc="Algoritmo proprietário que prioriza projetos cruzando Receita, Dor Técnica e Esforço (Velocity)."
                    icon={Target}
                    colSpan="md:col-span-2"
                  >
                      <div className="mt-4 h-48 bg-[#050505] rounded-xl border border-white/5 relative overflow-hidden flex items-center justify-center group-hover:border-amber-500/20 transition-colors">
                          {/* Simulated Scatter Plot */}
                          <div className="absolute inset-0 grid grid-cols-6 grid-rows-6">
                              {Array.from({length:36}).map((_,i) => <div key={i} className="border-[0.5px] border-white/5"></div>)}
                          </div>
                          {/* Data Points */}
                          <div className="absolute top-[20%] right-[20%] w-4 h-4 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.6)] animate-pulse"></div>
                          <div className="absolute bottom-[30%] left-[30%] w-3 h-3 bg-red-500 rounded-full opacity-50"></div>
                          <div className="absolute top-[40%] left-[50%] w-3 h-3 bg-amber-500 rounded-full opacity-80"></div>
                          
                          {/* Tooltip Simulation */}
                          <div className="absolute top-[10%] right-[12%] bg-slate-900 border border-white/10 px-3 py-1.5 rounded-lg text-[10px] text-white shadow-xl animate-in fade-in slide-in-from-bottom-2">
                              <span className="font-bold text-emerald-400">Score: 9.8</span>
                              <br/>Alta Prioridade
                          </div>
                      </div>
                  </BentoItem>

                  {/* Card 2: AI */}
                  <BentoItem 
                    title="Shinkō Guru AI" 
                    desc="Assistente neural que gera estruturas de projetos, cronogramas e checklists técnicos com um clique."
                    icon={BrainCircuit}
                  >
                      <div className="mt-4 flex flex-col gap-3">
                          <div className="flex gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">Eu</div>
                              <div className="bg-white/5 rounded-2xl rounded-tl-none p-3 text-[10px] text-slate-300 border border-white/5">
                                  Crie um SaaS de Delivery.
                              </div>
                          </div>
                          <div className="flex gap-2 flex-row-reverse">
                              <div className="w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center"><BrainCircuit className="w-3 h-3 text-white"/></div>
                              <div className="bg-amber-500/10 rounded-2xl rounded-tr-none p-3 text-[10px] text-amber-200 border border-amber-500/20 shadow-glow">
                                  <div className="flex items-center gap-1 mb-1"><Terminal className="w-3 h-3"/> Analisando Stack...</div>
                                  <div className="h-1 w-full bg-amber-500/20 rounded-full overflow-hidden">
                                      <div className="h-full w-2/3 bg-amber-500"></div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </BentoItem>

                  {/* Card 3: T.A.D.S. */}
                  <BentoItem 
                    title="Validação T.A.D.S." 
                    desc="Framework de 5 pontos para validar se uma ideia é escalável antes de escrever uma linha de código."
                    icon={ShieldCheck}
                  >
                      <div className="mt-4 space-y-2">
                          {['Escalabilidade Global', 'Recorrência (MRR)', 'Integração API', 'Dor Latente'].map((tag, i) => (
                              <div key={tag} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/5 group-hover:border-amber-500/20 transition-colors">
                                  <span className="text-xs font-medium text-slate-300">{tag}</span>
                                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${i < 3 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-800 text-slate-600'}`}>
                                      <Check className="w-3 h-3"/>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </BentoItem>

                  {/* Card 4: Full Cycle (Large) */}
                  <BentoItem 
                    title="Ciclo Completo" 
                    desc="Do lead no CRM ao deploy em produção. Tudo conectado financeiramente em um único fluxo."
                    icon={Layers}
                    colSpan="md:col-span-2"
                  >
                      <div className="mt-6 bg-[#050505] rounded-xl border border-white/5 p-4 flex items-center justify-between gap-2 overflow-hidden relative">
                          {/* Connection Line */}
                          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                          
                          {/* Steps */}
                          {[
                              { label: 'CRM', icon: Users, color: 'text-blue-400' },
                              { label: 'Projetos', icon: GitBranch, color: 'text-purple-400' },
                              { label: 'Financeiro', icon: BarChart3, color: 'text-emerald-400' }
                          ].map((step, i) => (
                              <div key={i} className="relative z-10 flex flex-col items-center bg-[#0A0A0A] px-4 py-2 rounded-lg border border-white/10 group-hover:border-white/20 transition-colors">
                                  <step.icon className={`w-5 h-5 mb-2 ${step.color}`}/>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{step.label}</span>
                              </div>
                          ))}
                      </div>
                  </BentoItem>

              </div>
          </section>

          {/* --- FOOTER --- */}
          <footer className="w-full border-t border-white/5 bg-[#020202] py-12 text-center relative z-10">
              <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex items-center gap-2 opacity-50">
                      <img src={displayLogo} alt="Shinko" className="h-6 w-auto grayscale opacity-50 hover:opacity-100 transition-opacity" />
                      <span className="font-bold text-sm text-slate-500">Shinkō OS</span>
                  </div>
                  <p className="text-slate-600 text-xs">
                      © 2025 Shinkō Innovation Framework. Todos os direitos reservados.
                  </p>
              </div>
          </footer>
      </main>
    </div>
  );
};
