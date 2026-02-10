
import React from 'react';
import { ArrowRight, Sparkles, Target, Zap, DollarSign, ChevronRight, Check, ShieldCheck, Globe, Cpu, BarChart3, Layers } from 'lucide-react';

interface Props {
  onEnter: () => void;
  onOpenBlog?: () => void;
  customName?: string;
  customLogo?: string | null;
}

const LOGO_URL = "https://zjssfnbcboibqeoubeou.supabase.co/storage/v1/object/public/fotoperfil/fotoperfil/3.png";

export const LandingPage: React.FC<Props> = ({ onEnter, customName, customLogo }) => {
  const brandName = customName || "Shinkō OS";
  const displayLogo = customLogo || LOGO_URL;

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-amber-500 selection:text-black">
      
      {/* NAVIGATION BAR */}
      <nav className="fixed top-0 left-0 right-0 z-[100] border-b border-slate-100 bg-white/70 backdrop-blur-2xl h-20">
          <div className="max-w-7xl mx-auto px-6 h-full flex justify-between items-center">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-amber-500 shadow-lg">
                    <img src={displayLogo} alt={brandName} className="w-6 h-6 object-contain" />
                </div>
                <span className="font-black text-xl tracking-tighter uppercase hidden sm:block">{brandName}</span>
            </div>
            
            <div className="flex items-center gap-8">
                <div className="hidden md:flex items-center gap-8 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <a href="#metodo" className="hover:text-amber-500 transition-colors">O Método</a>
                    <a href="#workflow" className="hover:text-amber-500 transition-colors">Workflow</a>
                    <a href="#ecossistema" className="hover:text-amber-500 transition-colors">Ecossistema</a>
                </div>
                <button 
                    onClick={onEnter} 
                    className="px-8 py-3 bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-full hover:bg-amber-500 hover:text-black transition-all active:scale-95 shadow-xl shadow-slate-900/10"
                >
                    Entrar no Terminal
                </button>
            </div>
          </div>
      </nav>

      <main className="pt-20">
          
          {/* HERO SECTION */}
          <section className="relative overflow-hidden bg-white">
              {/* Subtle background element */}
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[800px] h-[800px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none"></div>
              
              <div className="max-w-7xl mx-auto px-6 pt-24 pb-32 relative z-10 text-center">
                <div className="inline-flex items-center gap-3 px-4 py-2 bg-slate-50 border border-slate-100 rounded-full text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 mb-10 animate-fade-up shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500"/> Engineering Framework v2.6.4
                </div>
                
                <h1 className="text-6xl md:text-[110px] font-black mb-10 tracking-tighter leading-[0.85] text-slate-900 animate-fade-up [animation-delay:100ms]">
                    Onde a engenharia <br/>
                    encontra o <span className="text-amber-500">lucro</span>.
                </h1>
                
                <p className="text-lg md:text-2xl text-slate-500 max-w-3xl mx-auto mb-16 leading-relaxed font-medium animate-fade-up [animation-delay:200ms]">
                    O Shinkō é o sistema operacional para empresas que constroem tecnologia de elite. 
                    Substitua o caos por uma gestão de ativos baseada em valor industrial.
                </p>
                
                <div className="flex flex-col sm:flex-row justify-center items-center gap-6 animate-fade-up [animation-delay:300ms]">
                    <button onClick={onEnter} className="w-full sm:w-auto px-12 py-6 bg-slate-900 text-white font-black text-xs uppercase tracking-[0.3em] rounded-2xl hover:bg-amber-500 hover:text-black transition-all flex items-center justify-center gap-4 active:scale-95 shadow-2xl">
                        Criar meu Workspace <ArrowRight className="w-5 h-5"/>
                    </button>
                    <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">
                        Ver Documentação Técnica <ChevronRight className="w-4 h-4"/>
                    </button>
                </div>
              </div>
          </section>

          {/* SOCIAL PROOF / TRUST */}
          <section className="border-y border-slate-100 py-12 bg-white">
              <div className="max-w-7xl mx-auto px-6">
                  <p className="text-center text-[9px] font-black uppercase tracking-[0.4em] text-slate-300 mb-8">Framework operado em ativos de elite</p>
                  <div className="flex flex-wrap justify-center gap-12 md:gap-24 opacity-30 grayscale hover:grayscale-0 transition-all duration-700">
                      <div className="font-black text-xl italic tracking-tighter">FINTECH_CO</div>
                      <div className="font-black text-xl italic tracking-tighter">ENGINE_SAAS</div>
                      <div className="font-black text-xl italic tracking-tighter">CORE_LOGIC</div>
                      <div className="font-black text-xl italic tracking-tighter">VALUESCAN</div>
                      <div className="font-black text-xl italic tracking-tighter">LOGISTIX</div>
                  </div>
              </div>
          </section>

          {/* BENTO PILLARS SECTION */}
          <section id="metodo" className="py-32 bg-slate-50/50">
              <div className="max-w-7xl mx-auto px-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      
                      {/* PILLAR 1: IDENTIFICATION */}
                      <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-soft space-y-6 group hover:border-amber-500/20 transition-all duration-500">
                          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                              <Target className="w-8 h-8"/>
                          </div>
                          <h3 className="text-2xl font-black tracking-tight">Priorização RDE.</h3>
                          <p className="text-slate-500 leading-relaxed text-sm font-medium">
                              Pare de chutar o que é importante. Nosso motor cruza **Velocidade, Viabilidade e Receita** para colocar sua equipe no quadrante verde.
                          </p>
                          <div className="pt-4 flex items-center gap-2 text-[9px] font-black text-amber-500 uppercase tracking-widest">
                              <Zap className="w-3 h-3"/> Score Prio-6 Ativado
                          </div>
                      </div>

                      {/* PILLAR 2: PROCESS ENGINE */}
                      <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl space-y-6 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-8 opacity-10"><Cpu className="w-24 h-24"/></div>
                          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-white relative z-10">
                              <Layers className="w-8 h-8"/>
                          </div>
                          <h3 className="text-2xl font-black tracking-tight relative z-10">Cadeia de Valor.</h3>
                          <p className="text-slate-400 leading-relaxed text-sm font-medium relative z-10">
                              Mapeie cada processo primário e de apoio. Saiba exatamente onde o custo de engenharia está gerando diferencial competitivo real.
                          </p>
                          <div className="pt-4 flex items-center gap-2 text-[9px] font-black text-emerald-400 uppercase tracking-widest relative z-10">
                              <ShieldCheck className="w-3 h-3"/> Auditoria ABC
                          </div>
                      </div>

                      {/* PILLAR 3: YIELD & GROWTH */}
                      <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-soft space-y-6 group hover:border-amber-500/20 transition-all duration-500">
                          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                              <DollarSign className="w-8 h-8"/>
                          </div>
                          <h3 className="text-2xl font-black tracking-tight">Monitoramento Yield.</h3>
                          <p className="text-slate-500 leading-relaxed text-sm font-medium">
                              Acompanhe o MRR e a margem bruta por projeto em tempo real. Transforme código em patrimônio financeiro auditável.
                          </p>
                          <div className="pt-4 flex items-center gap-2 text-[9px] font-black text-blue-500 uppercase tracking-widest">
                              <Globe className="w-3 h-3"/> Sincronização Ledger
                          </div>
                      </div>

                  </div>
              </div>
          </section>

          {/* WORKFLOW PREVIEW */}
          <section id="workflow" className="py-40 bg-white overflow-hidden">
              <div className="max-w-7xl mx-auto px-6">
                  <div className="flex flex-col lg:flex-row items-center gap-20">
                      <div className="flex-1 space-y-10">
                          <div className="space-y-4">
                              <h2 className="text-5xl font-black tracking-tighter leading-none">O fluxo da <span className="text-amber-500">Performance</span>.</h2>
                              <p className="text-xl text-slate-500 font-medium">Uma interface projetada para quem pensa em escala industrial, não apenas em "cards".</p>
                          </div>
                          
                          <div className="space-y-8">
                              {[
                                  { t: "Pipeline de Valor", d: "Capture oportunidades, valide via T.A.D.S e defina arquétipos técnicos em segundos." },
                                  { t: "Kanban Operacional", d: "Distribuição automática de carga baseada em especialidade e custo-hora real." },
                                  { t: "Inteligência Shinkō", d: "Insights gerados via IA sobre gargalos operacionais e oportunidades de expansão de MRR." }
                              ].map((item, i) => (
                                  <div key={i} className="flex gap-6">
                                      <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-1">
                                          <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                                      </div>
                                      <div>
                                          <h4 className="font-black text-lg">{item.t}</h4>
                                          <p className="text-slate-500 text-sm">{item.d}</p>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                      
                      <div className="flex-1 relative">
                          <div className="absolute inset-0 bg-amber-500/10 rounded-[4rem] blur-3xl -rotate-6 scale-90"></div>
                          <div className="relative bg-slate-900 rounded-[3.5rem] p-4 shadow-2xl border border-white/10 group">
                              <div className="bg-slate-800 rounded-[3rem] overflow-hidden aspect-video relative">
                                  <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center space-y-4">
                                      <BarChart3 className="w-16 h-16 text-white/20 group-hover:scale-110 group-hover:text-amber-500 transition-all duration-700"/>
                                      <div className="text-white font-black text-xs uppercase tracking-[0.5em] opacity-30">Preview Interface v2.6</div>
                                  </div>
                                  <div className="absolute bottom-6 left-6 right-6 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                      <div className="h-full bg-amber-500 w-[70%] animate-pulse"></div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </section>

          {/* FINAL CTA */}
          <section className="py-24 px-6">
              <div className="max-w-7xl mx-auto">
                  <div className="bg-slate-900 rounded-[4rem] p-12 md:p-24 text-center space-y-12 relative overflow-hidden">
                      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                      <div className="absolute top-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px] -ml-32 -mt-32"></div>
                      <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] -mr-32 -mb-32"></div>

                      <div className="relative z-10 space-y-6">
                          <h2 className="text-4xl md:text-7xl font-black text-white tracking-tighter leading-none">Pronto para a <span className="text-amber-500">Engenharia de Elite</span>?</h2>
                          <p className="text-slate-400 text-lg md:text-2xl max-w-2xl mx-auto font-medium">A inovação não pode ser um processo de sorte. Implemente o framework hoje.</p>
                      </div>

                      <div className="relative z-10">
                          <button onClick={onEnter} className="px-16 py-7 bg-amber-500 text-black font-black text-sm uppercase tracking-[0.4em] rounded-3xl hover:scale-105 transition-all shadow-glow-amber active:scale-95">
                              Inicializar Terminal
                          </button>
                          <p className="text-[10px] text-slate-500 font-bold uppercase mt-8 tracking-widest flex items-center justify-center gap-3">
                              <Check className="w-4 h-4 text-emerald-500"/> Sincronização Imediata
                              <Check className="w-4 h-4 text-emerald-500"/> Matriz RDE Inclusa
                          </p>
                      </div>
                  </div>
              </div>
          </section>

      </main>

      <footer className="border-t border-slate-100 py-20 bg-white">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
              <div className="md:col-span-2 space-y-6">
                  <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-amber-500">
                         <img src={displayLogo} alt="Logo" className="w-4 h-4 object-contain" />
                      </div>
                      <span className="font-black text-lg tracking-tighter uppercase">{brandName}</span>
                  </div>
                  <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
                      O Shinkō OS é um produto do Framework de Inovação Industrial. 
                      Sediado em 2026, projetado para o crescimento infinito.
                  </p>
              </div>
              
              <div className="space-y-6">
                  <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Navegação</h5>
                  <ul className="space-y-4 text-sm font-bold text-slate-400">
                      <li><a href="#" className="hover:text-amber-500 transition-colors">Diferenciais</a></li>
                      <li><a href="#" className="hover:text-amber-500 transition-colors">Engenharia</a></li>
                      <li><a href="#" className="hover:text-amber-500 transition-colors">Pricing</a></li>
                  </ul>
              </div>

              <div className="space-y-6">
                  <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Legal</h5>
                  <ul className="space-y-4 text-sm font-bold text-slate-400">
                      <li><a href="#" className="hover:text-amber-500 transition-colors">Privacidade</a></li>
                      <li><a href="#" className="hover:text-amber-500 transition-colors">Segurança Cloud</a></li>
                      <li><a href="#" className="hover:text-amber-500 transition-colors">ISO 27001</a></li>
                  </ul>
              </div>
          </div>
          
          <div className="max-w-7xl mx-auto px-6 mt-20 pt-10 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
              <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">&copy; 2026 Shinkō Engineering Group. Design Industrial Flat.</p>
              <div className="flex gap-8">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Network Status: Optimized</span>
              </div>
          </div>
      </footer>

      <style>{`
          .shadow-glow-amber { box-shadow: 0 10px 40px -5px rgba(245, 158, 11, 0.4); }
          .shadow-glow-white { box-shadow: 0 10px 40px -5px rgba(255, 255, 255, 0.2); }
          .shadow-soft { box-shadow: 0 20px 60px -15px rgba(0, 0, 0, 0.03); }
      `}</style>
    </div>
  );
};
