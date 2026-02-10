
import React from 'react';
import { ArrowRight, Sparkles, Target, Zap, DollarSign, ChevronRight } from 'lucide-react';

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
    <div className="fixed inset-0 z-[200] bg-white text-slate-900 overflow-y-auto font-sans">
      
      <nav className="fixed top-0 left-0 right-0 z-[100] border-b border-slate-100 bg-white/80 backdrop-blur-md h-16 md:h-20">
          <div className="max-w-7xl mx-auto px-6 h-full flex justify-between items-center">
            <div className="flex items-center gap-3">
                <img src={displayLogo} alt={brandName} className="h-8 md:h-10 w-auto object-contain" />
            </div>
            <button onClick={onEnter} className="px-6 py-2 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-full hover:bg-slate-800 transition-all active:scale-95">
                Entrar
            </button>
          </div>
      </nav>

      <main className="relative z-10">
          <section className="max-w-5xl mx-auto px-6 pt-32 pb-20 md:pt-48 md:pb-32 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-100 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500 mb-8 animate-fade-up">
                <Sparkles className="w-3 h-3 text-amber-500"/> Framework de Inovação Industrial
            </div>
            <h1 className="text-5xl md:text-8xl font-black mb-8 tracking-tighter leading-[0.9] text-slate-900 animate-fade-up" style={{ animationDelay: '0.1s' }}>
                Organize sua empresa, <br/>escale seus <span className="text-amber-500">projetos</span>.
            </h1>
            <p className="text-lg md:text-2xl text-slate-500 max-w-2xl mx-auto mb-12 leading-relaxed font-medium animate-fade-up" style={{ animationDelay: '0.2s' }}>
                O Shinkō substitui planilhas confusas por uma gestão de ativos de alta performance. 
                Simples, flat e direto ao ponto.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 animate-fade-up" style={{ animationDelay: '0.3s' }}>
                <button onClick={onEnter} className="px-10 py-5 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 active:scale-95">
                    Começar projeto <ArrowRight className="w-4 h-4"/>
                </button>
            </div>
          </section>

          <section className="border-y border-slate-100 bg-slate-50/50">
              <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                  <div className="p-12 space-y-4">
                      <Target className="w-8 h-8 text-amber-500 mb-4"/>
                      <h3 className="text-xl font-black">Priorização</h3>
                      <p className="text-slate-500 text-sm leading-relaxed">Saiba exatamente qual projeto focar hoje usando nossa matriz de valor industrial.</p>
                  </div>
                  <div className="p-12 space-y-4">
                      <Zap className="w-8 h-8 text-blue-500 mb-4"/>
                      <h3 className="text-xl font-black">Velocidade</h3>
                      <p className="text-slate-500 text-sm leading-relaxed">Workflow limpo para que sua equipe execute sem travas burocráticas.</p>
                  </div>
                  <div className="p-12 space-y-4">
                      <DollarSign className="w-8 h-8 text-emerald-500 mb-4"/>
                      <h3 className="text-xl font-black">Resultado</h3>
                      <p className="text-slate-500 text-sm leading-relaxed">Acompanhe a lucratividade e o crescimento de cada iniciativa em tempo real.</p>
                  </div>
              </div>
          </section>

          <section className="py-32 text-center">
              <h2 className="text-3xl md:text-5xl font-black tracking-tighter mb-10">Tudo pronto para evoluir?</h2>
              <button onClick={onEnter} className="px-12 py-5 bg-amber-500 text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-amber-600 transition-all active:scale-95">
                  Criar meu Workspace
              </button>
          </section>
      </main>

      <footer className="border-t border-slate-100 py-12 text-center bg-white">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">&copy; 2026 Shinkō Systems. Design Flat Industrial.</p>
      </footer>
    </div>
  );
};
