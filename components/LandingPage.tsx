
import React, { useState } from 'react';
import { ArrowRight, Rocket, PlayCircle, Plus, Minus, Target, BarChart3, GitMerge, History, Calendar as CalendarIcon, Layout, BrainCircuit, Layers, GanttChartSquare, Clock, FileSearch, Users, ShieldCheck } from 'lucide-react';

interface Props {
  onEnter: () => void;
}

const LOGO_URL = "https://zjssfnbcboibqeoubeou.supabase.co/storage/v1/object/public/fotoperfil/fotoperfil/1.png";

export const LandingPage: React.FC<Props> = ({ onEnter }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="fixed inset-0 h-full w-full bg-[#050505] text-white overflow-y-auto overflow-x-hidden selection:bg-amber-500/30 font-sans scroll-smooth z-[50]">
      
      {/* Global Background Mesh */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#050505] to-[#050505]">
         {/* Grid Pattern Overlay */}
         <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
         
         <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-600/10 rounded-full blur-[150px] animate-pulse"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-amber-600/10 rounded-full blur-[150px]" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Glass Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
           <div className="flex items-center gap-3 cursor-pointer group" onClick={onEnter}>
              <div className="relative w-10 h-10 transition-transform group-hover:scale-105">
                  <div className="absolute inset-0 bg-amber-500 blur-lg opacity-40 rounded-lg"></div>
                  <img src={LOGO_URL} alt="Shinkō Logo" className="w-10 h-10 rounded-lg relative z-10 object-cover shadow-lg" />
              </div>
              <span className="text-xl font-black tracking-tight text-white">Shink<span className="text-amber-500">ŌS</span></span>
           </div>
           <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
              <a href="#framework" className="hover:text-white transition-colors hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">O Framework</a>
              <a href="#recursos" className="hover:text-white transition-colors hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">Recursos</a>
              <a href="#faq" className="hover:text-white transition-colors hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">FAQ</a>
           </div>
           <div className="flex items-center gap-4">
               <button onClick={onEnter} className="text-sm font-bold text-slate-300 hover:text-white hidden md:block transition-colors">Login</button>
               <button 
                 onClick={onEnter}
                 className="glass-button px-6 py-2.5 rounded-full text-sm font-bold hover:bg-white/10 hover:border-white/20 transition-all shadow-[0_0_20px_rgba(245,158,11,0.15)] border border-white/10"
               >
                 Acessar OS
               </button>
           </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative z-10 pt-32 pb-20 px-6 min-h-screen flex flex-col justify-center">
          <div className="max-w-6xl mx-auto text-center relative">
              
              {/* Glowing Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel border-white/10 text-amber-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-10 animate-ios-pop shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                 <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_10px_#f59e0b]"></span> 
                 ShinkŌS v2.5
              </div>
              
              {/* Main Title */}
              <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.95] animate-in fade-in slide-in-from-bottom-8 duration-1000 drop-shadow-2xl">
                 <span className="block text-slate-300 opacity-50 text-4xl md:text-6xl mb-2 tracking-normal font-bold">Inovação não é sorte.</span>
                 <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-slate-400 drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">É Engenharia.</span>
              </h1>
              
              <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed font-light animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-100">
                 O ShinkŌS é o sistema operacional que transforma ideias caóticas em <span className="text-white font-medium border-b border-amber-500/50">receita previsível</span> através de algoritmos de priorização e governança automatizada.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-in fade-in zoom-in-95 duration-1000 delay-200">
                 <button 
                   onClick={onEnter}
                   className="group h-16 px-10 rounded-full bg-white text-black font-bold text-lg shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] hover:scale-105 transition-all flex items-center gap-3 relative overflow-hidden"
                 >
                   <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-0 group-hover:opacity-50 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                   <Rocket className="w-5 h-5" />
                   Iniciar Agora
                 </button>
                 
                 <button onClick={onEnter} className="h-16 px-8 rounded-full glass-panel border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white font-medium transition-all flex items-center gap-3 group">
                    <PlayCircle className="w-10 h-10 text-white/20 group-hover:text-amber-500 transition-colors" /> 
                    <span className="text-sm text-left leading-tight">Ver Demo<br/><span className="text-[10px] opacity-60 uppercase tracking-widest">2 min</span></span>
                 </button>
              </div>
          </div>
      </section>

      {/* FRAMEWORK SECTION */}
      <section id="framework" className="py-32 relative z-10 border-t border-white/5 bg-black/40 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6">
             <div className="text-center mb-20">
                <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight text-white">O Framework <span className="text-amber-500">Shinkō</span></h2>
                <p className="text-xl text-slate-400 max-w-2xl mx-auto font-light">
                    Um funil de validação científica em 6 etapas para garantir que apenas projetos de alto potencial sobrevivam.
                </p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 relative">
                {/* Connecting Line (Desktop) */}
                <div className="hidden lg:block absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-amber-500/0 via-amber-500/20 to-amber-500/0 -translate-y-1/2 z-0"></div>

                {[
                    { step: '01', title: 'Conceito', icon: BrainCircuit, desc: 'Definição clara da dor e solução.' },
                    { step: '02', title: 'Decisão', icon: Target, desc: 'Matriz MVV: Velocidade vs Viabilidade.' },
                    { step: '03', title: 'Arquétipo', icon: Layers, desc: 'Modelo de negócio e distribuição.' },
                    { step: '04', title: 'Aderência', icon: MagnetIcon, desc: 'Teste TADS para escalabilidade.' },
                    { step: '05', title: 'Evidências', icon: FileTextIcon, desc: 'Provas reais de demanda de mercado.' },
                    { step: '06', title: 'Score', icon: BarChart3, desc: 'Pontuação PRIO-6 matemática.' },
                ].map((item, i) => (
                    <div key={i} className="glass-panel p-6 rounded-2xl border-white/10 relative z-10 hover:-translate-y-2 transition-transform group bg-[#0a0a0a]/80 backdrop-blur-xl">
                        <div className="w-10 h-10 rounded-full bg-slate-900 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold text-sm mb-4 shadow-[0_0_15px_rgba(245,158,11,0.2)] group-hover:bg-amber-500 group-hover:text-white transition-colors relative mx-auto lg:mx-0">
                           <item.icon className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-white text-lg mb-2 text-center lg:text-left">{item.title}</h3>
                        <p className="text-xs text-slate-400 leading-relaxed text-center lg:text-left">{item.desc}</p>
                    </div>
                ))}
             </div>
          </div>
      </section>

      {/* RECURSOS / FEATURE CARDS */}
      <section id="recursos" className="py-32 px-6 relative z-10">
         <div className="max-w-7xl mx-auto">
            <div className="mb-20 text-center">
               <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">O Motor da Sua Inovação</h2>
               <p className="text-xl text-slate-400 max-w-2xl mx-auto font-light">
                  Um conjunto completo de ferramentas projetadas para eliminar fricção e acelerar resultados.
               </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                    { 
                        title: 'Matriz RDE & Prio-6', 
                        icon: BarChart3, 
                        desc: 'Algoritmo proprietário que cruza Risco, Demanda e Execução para gerar um score matemático de prioridade.', 
                        color: 'text-blue-500', bg: 'bg-blue-500/10' 
                    },
                    { 
                        title: 'Gantt Chart Interativo', 
                        icon: GanttChartSquare, 
                        desc: 'Visualização cronológica completa com dependências, visão hierárquica (Projetos > Nós) e redimensionamento arrastável.', 
                        color: 'text-teal-500', bg: 'bg-teal-500/10' 
                    },
                    { 
                        title: 'Nivelamento de Recursos', 
                        icon: Clock, 
                        desc: 'Algoritmo "Granular Split" que divide tarefas automaticamente para respeitar o limite de 8h/dia por pessoa.', 
                        color: 'text-purple-500', bg: 'bg-purple-500/10' 
                    },
                    { 
                        title: 'BPMS & IA Generativa', 
                        icon: BrainCircuit, 
                        desc: 'A IA do Google Gemini 2.5 lê seus PDFs e gera fluxogramas BPMN e checklists técnicos automaticamente.', 
                        color: 'text-indigo-500', bg: 'bg-indigo-500/10' 
                    },
                    { 
                        title: 'Gestão Visual Kanban', 
                        icon: Layout, 
                        desc: 'Acompanhe o fluxo de trabalho em tempo real, com colunas personalizáveis e filtros por responsável.', 
                        color: 'text-pink-500', bg: 'bg-pink-500/10' 
                    },
                    { 
                        title: 'Governança Storytime', 
                        icon: History, 
                        desc: 'Log auditável imutável. Cada upload, comentário ou mudança de status fica registrado na linha do tempo.', 
                        color: 'text-amber-500', bg: 'bg-amber-500/10' 
                    },
                    { 
                        title: 'Ingestão de Docs (OCR)', 
                        icon: FileSearch, 
                        desc: 'Extração de contexto de PDFs e documentos técnicos para enriquecer as tarefas sem digitação manual.', 
                        color: 'text-cyan-500', bg: 'bg-cyan-500/10' 
                    },
                    { 
                        title: 'Triângulo da Decisão', 
                        icon: Target, 
                        desc: 'Balanceamento visual entre Velocidade, Viabilidade e Receita para garantir que você ataca os problemas certos.', 
                        color: 'text-emerald-500', bg: 'bg-emerald-500/10' 
                    },
                    { 
                        title: 'Portal do Cliente', 
                        icon: Users, 
                        desc: 'Acesso restrito para stakeholders externos acompanharem o progresso e aprovarem etapas críticas.', 
                        color: 'text-orange-500', bg: 'bg-orange-500/10' 
                    },
                ].map((feat, i) => (
                    <div key={i} className="glass-panel p-8 rounded-2xl border border-white/10 hover:border-white/20 transition-all hover:-translate-y-1 group bg-[#0a0a0a]/40 backdrop-blur-md flex flex-col">
                        <div className={`w-12 h-12 rounded-lg ${feat.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                            <feat.icon className={`w-6 h-6 ${feat.color}`}/>
                        </div>
                        <h3 className="text-lg font-bold text-white mb-3">{feat.title}</h3>
                        <p className="text-sm text-slate-400 leading-relaxed">{feat.desc}</p>
                    </div>
                ))}
            </div>
            
            <div className="mt-12 text-center">
                 <button onClick={onEnter} className="text-amber-500 hover:text-amber-400 font-bold text-sm flex items-center gap-2 mx-auto group transition-colors">
                     Explorar o Sistema Completo <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform"/>
                 </button>
            </div>
         </div>
      </section>

      {/* PAIN VS GAIN */}
      <section className="py-32 relative border-t border-white/5 bg-black/40">
          <div className="max-w-7xl mx-auto px-6 flex flex-col items-center justify-center">
              <h2 className="text-4xl font-black tracking-tight text-center mb-16">
                  Pronto para <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-500">profissionalizar</span> <br/> sua inovação?
              </h2>
          </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-6 max-w-3xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-12 tracking-tight">Perguntas Frequentes</h2>
          <div className="space-y-4">
              {[
                  { q: "O ShinkŌS serve para minha empresa?", a: "Sim, se você gerencia múltiplos projetos e precisa de clareza sobre onde investir recursos. Ideal para consultorias, software houses e departamentos de inovação." },
                  { q: "Como a automação ajuda na prática?", a: "Utilizamos Gemini 2.5 Pro para ler documentos técnicos e gerar cronogramas, checklists e análises de risco automaticamente, economizando horas de planejamento manual." },
                  { q: "Posso convidar clientes externos?", a: "Sim! O sistema possui perfis de acesso específicos para clientes, permitindo que eles acompanhem o progresso e aprovem etapas sem ver dados sensíveis internos." },
                  { q: "Meus dados estão seguros?", a: "Absolutamente. Utilizamos criptografia de ponta a ponta, isolamento de dados por organização (RLS) e logs de auditoria imutáveis." }
              ].map((item, i) => (
                  <div key={i} className="glass-panel border border-white/5 rounded-xl overflow-hidden transition-all hover:bg-white/5 bg-[#0a0a0a]/60">
                      <button onClick={() => toggleFaq(i)} className="w-full flex items-center justify-between p-6 text-left font-bold text-slate-200 hover:text-white transition-colors">
                          {item.q}
                          {openFaq === i ? <Minus className="w-4 h-4 text-amber-500"/> : <Plus className="w-4 h-4 text-slate-500"/>}
                      </button>
                      {openFaq === i && (
                          <div className="px-6 pb-6 text-slate-400 text-sm leading-relaxed border-t border-white/5 pt-4 animate-in slide-in-from-top-2">
                              {item.a}
                          </div>
                      )}
                  </div>
              ))}
          </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-black text-center text-slate-600 text-sm">
         <p>&copy; 2026 Shinkō Innovation Framework. Design System v2.5</p>
      </footer>
    </div>
  );
};

// Helper Icons
function MagnetIcon(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 15-4-4 6.75-6.77a7.79 7.79 0 0 1 11 11L13 22l-4-4 6.39-6.35a2.8 2.8 0 0 0-3.92-3.96L6 15Z"/></svg>
}

function FileTextIcon(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
}
