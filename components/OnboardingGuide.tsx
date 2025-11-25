
import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles, Target, Zap, Layout } from 'lucide-react';

interface Step {
  targetId?: string; // Se null, é um modal central
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const STEPS: Step[] = [
  {
    targetId: undefined, // Modal Central
    title: "Bem-vindo ao ShinkŌS",
    description: "Você está acessando uma demonstração interativa. Este sistema transforma o caos da inovação em um processo previsível e lucrativo. Vamos fazer um tour rápido?",
  },
  {
    targetId: 'dashboard-stats',
    title: "Painel de Comando",
    description: "Acompanhe em tempo real o status do seu portfólio. Projetos em Execução (Sprints), Negociação comercial e Backlog futuro.",
    position: 'bottom'
  },
  {
    targetId: 'matrix-chart-container',
    title: "O Cérebro: Matriz RDE",
    description: "Nosso algoritmo prioriza matematicamente seus projetos cruzando Velocidade, Viabilidade e Receita. Ataque apenas o que está no quadrante verde.",
    position: 'left'
  },
  {
    targetId: 'nav-kanban-btn',
    title: "Execução Visual",
    description: "O Kanban gerencia o fluxo de trabalho da equipe, garantindo que nada fique travado.",
    position: 'right'
  },
  {
    targetId: 'nav-create-btn',
    title: "Motor de Inovação",
    description: "Aqui você cadastra novas oportunidades. Nossa IA irá gerar automaticamente o escopo, tarefas e cronograma inicial.",
    position: 'right'
  },
  {
    targetId: undefined, // Modal Final
    title: "Você está no comando",
    description: "Sinta-se à vontade para clicar nos projetos, arrastar tarefas no Kanban ou simular a criação de uma nova oportunidade. Aproveite a experiência Shinkō.",
  }
];

interface Props {
  run: boolean;
  onFinish: () => void;
}

export const OnboardingGuide: React.FC<Props> = ({ run, onFinish }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [position, setPosition] = useState<{top: number, left: number, width: number, height: number} | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!run) return;

    const step = STEPS[currentStepIndex];
    
    // Se for modal central
    if (!step.targetId) {
      setPosition(null);
      setIsVisible(true);
      return;
    }

    // Se for elemento alvo
    const updatePosition = () => {
      const element = document.getElementById(step.targetId!);
      if (element) {
        const rect = element.getBoundingClientRect();
        setPosition({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height
        });
        setIsVisible(true);
        // Scroll suave até o elemento se necessário
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        // Se não achar o elemento (ex: mudou de tela), tenta pular ou manter visivel como modal fallback
        console.warn(`Elemento ${step.targetId} não encontrado`);
      }
    };

    // Pequeno delay para garantir renderização do DOM
    const timer = setTimeout(updatePosition, 500);
    window.addEventListener('resize', updatePosition);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePosition);
    };
  }, [currentStepIndex, run]);

  if (!run) return null;

  const step = STEPS[currentStepIndex];
  const isModal = !step.targetId;
  const isLastStep = currentStepIndex === STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onFinish();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) setCurrentStepIndex(prev => prev - 1);
  };

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
      
      {/* Backdrop Darkener with Hole (Clip Path implementation is complex, using simple overlay for Modal or borders for Highlight) */}
      {isModal && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm pointer-events-auto transition-opacity duration-500"></div>
      )}

      {/* Spotlight Highlight for Target Steps */}
      {!isModal && position && (
        <>
           {/* Dimmed Background composed of 4 divs around the target */}
           <div className="absolute inset-0 pointer-events-auto transition-all duration-500 ease-in-out" style={{
               background: `
                 radial-gradient(circle at ${position.left + position.width/2}px ${position.top + position.height/2}px, transparent ${Math.max(position.width, position.height) * 0.6}px, rgba(0,0,0,0.7) ${Math.max(position.width, position.height) * 0.8}px)
               `
           }}></div>
           
           {/* Active Ring around element */}
           <div 
             className="absolute border-2 border-amber-500 rounded-xl shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-all duration-500 ease-in-out animate-pulse"
             style={{
               top: position.top - 4,
               left: position.left - 4,
               width: position.width + 8,
               height: position.height + 8
             }}
           ></div>
        </>
      )}

      {/* Card Content */}
      <div 
        className={`pointer-events-auto absolute transition-all duration-500 ease-in-out flex flex-col items-center justify-center ${
           isModal 
             ? 'inset-0' 
             : ''
        }`}
        style={!isModal && position ? {
            top: step.position === 'bottom' ? position.top + position.height + 20 : 
                 step.position === 'top' ? position.top - 200 : 
                 position.top,
            left: step.position === 'right' ? position.left + position.width + 20 :
                  step.position === 'left' ? position.left - 340 :
                  position.left + (position.width / 2) - 160
        } : {}}
      >
          <div className={`bg-slate-900 border border-amber-500/30 text-white p-6 rounded-2xl shadow-2xl max-w-sm w-full relative animate-in zoom-in-95 duration-300 ${isModal ? 'scale-110' : ''}`}>
             
             {/* Decoration */}
             <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-amber-500/20 blur-2xl rounded-full"></div>
             
             <button onClick={onFinish} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5"/></button>

             <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                   {isModal ? <Sparkles className="w-5 h-5 text-white"/> : <Target className="w-5 h-5 text-white"/>}
                </div>
                <div>
                   <h3 className="font-bold text-lg leading-tight">{step.title}</h3>
                   <span className="text-[10px] text-amber-500 font-bold tracking-widest uppercase">Guia Shinkō {currentStepIndex + 1}/{STEPS.length}</span>
                </div>
             </div>

             <p className="text-slate-300 text-sm leading-relaxed mb-6 relative z-10">
                {step.description}
             </p>

             <div className="flex justify-between items-center relative z-10">
                <button 
                  onClick={handlePrev} 
                  disabled={currentStepIndex === 0}
                  className="text-slate-500 hover:text-white disabled:opacity-30 text-sm font-medium flex items-center gap-1"
                >
                   <ChevronLeft className="w-4 h-4"/> Voltar
                </button>
                
                <button 
                  onClick={handleNext}
                  className="bg-white text-slate-900 hover:bg-amber-500 hover:text-white px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg"
                >
                   {isLastStep ? 'Explorar Agora' : 'Próximo'} <ChevronRight className="w-4 h-4"/>
                </button>
             </div>
          </div>
      </div>

    </div>
  );
};
