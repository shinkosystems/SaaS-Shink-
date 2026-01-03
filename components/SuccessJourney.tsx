
import React from 'react';
import { CheckCircle2, Circle, Trophy, ArrowRight, Sparkles, Rocket, Zap, Target } from 'lucide-react';

interface Props {
    milestones: any[];
    onAction: (id: string) => void;
}

export const SuccessJourney: React.FC<Props> = ({ milestones, onAction }) => {
    const completedCount = milestones.filter(m => m.completed).length;
    const progress = Math.round((completedCount / milestones.length) * 100);

    return (
        <div className="glass-card p-8 rounded-[2.5rem] bg-slate-900 border-amber-500/20 text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full -mr-24 -mt-24 blur-3xl"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-amber-500 text-[10px] font-black uppercase tracking-[0.3em]">
                        <Trophy className="w-3 h-3"/> Jornada de Sucesso Shinkō
                    </div>
                    <h3 className="text-2xl font-black tracking-tighter">Domine o Framework.</h3>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-black text-amber-500">{progress}%</div>
                    <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Nível de Maturidade</div>
                </div>
            </div>

            <div className="relative z-10 space-y-4">
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mb-8">
                    <div className="h-full bg-amber-500 shadow-glow-amber transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {milestones.map((m, idx) => (
                        <div 
                            key={m.id} 
                            onClick={() => !m.completed && onAction(m.actionId)}
                            className={`p-5 rounded-2xl border transition-all cursor-pointer group ${m.completed ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/5 border-white/10 hover:border-amber-500/30'}`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                {m.completed ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                ) : (
                                    <Circle className="w-5 h-5 text-slate-600 group-hover:text-amber-500" />
                                )}
                                <span className="text-[8px] font-black text-slate-500">M{idx + 1}</span>
                            </div>
                            <h4 className={`text-[11px] font-black uppercase tracking-widest ${m.completed ? 'text-emerald-400' : 'text-slate-300'}`}>{m.label}</h4>
                            <p className="text-[9px] text-slate-500 mt-1 leading-tight">{m.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
