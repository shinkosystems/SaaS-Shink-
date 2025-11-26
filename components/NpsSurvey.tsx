
import React, { useState, useEffect } from 'react';
import { X, Send, MessageSquare, Smile, Frown, Meh } from 'lucide-react';
import { submitNpsResponse, checkUserNpsEligibility } from '../services/analyticsService';

interface Props {
    userId?: string;
    userRole?: string;
}

export const NpsSurvey: React.FC<Props> = ({ userId, userRole }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [score, setScore] = useState<number | null>(null);
    const [feedback, setFeedback] = useState('');
    const [step, setStep] = useState<'score' | 'feedback' | 'thanks'>('score');

    useEffect(() => {
        if (!userId) return;

        const checkAndShow = async () => {
            // 1. Verifica "Soneca" Local (Se usuário fechou no X recentemente)
            const storageKeyDismissed = `shinko_nps_dismissed_${userId}`;
            const dismissedAt = localStorage.getItem(storageKeyDismissed);
            const now = Date.now();
            const threeDays = 3 * 24 * 60 * 60 * 1000;

            if (dismissedAt && (now - parseInt(dismissedAt) < threeDays)) {
                return; // Não mostra se fechou recentemente
            }

            // 2. Verifica no Banco de Dados se é elegível (Nunca respondeu OU > 30 dias)
            const isEligible = await checkUserNpsEligibility(userId);

            if (isEligible) {
                // Delay suave para não assustar o usuário ao entrar
                setTimeout(() => setIsVisible(true), 5000);
            }
        };

        checkAndShow();
    }, [userId, userRole]);

    const handleScore = (val: number) => {
        setScore(val);
        setStep('feedback');
    };

    const handleDismiss = () => {
        setIsVisible(false);
        if (userId) {
            localStorage.setItem(`shinko_nps_dismissed_${userId}`, Date.now().toString());
        }
    };

    const handleSubmit = async () => {
        if (score !== null && userId) {
            await submitNpsResponse(score, feedback, userId);
            setStep('thanks');
            setTimeout(() => setIsVisible(false), 3000);
        }
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[100] w-full max-w-sm animate-ios-spring-up">
            <div className="glass-panel bg-white/90 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl overflow-hidden relative backdrop-blur-xl">
                
                {/* Botão Fechar */}
                <button 
                    onClick={handleDismiss}
                    className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="p-6">
                    {step === 'score' && (
                        <div className="text-center space-y-4">
                            <div className="flex justify-center text-shinko-primary mb-2">
                                <MessageSquare className="w-8 h-8" />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-slate-900 dark:text-white">Sua opinião importa!</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    De 0 a 10, qual a probabilidade de você recomendar a Shinkō para um amigo ou colega?
                                </p>
                            </div>
                            
                            <div className="flex justify-between gap-1 pt-2">
                                {Array.from({ length: 11 }, (_, i) => i).map((val) => (
                                    <button
                                        key={val}
                                        onClick={() => handleScore(val)}
                                        className={`w-7 h-10 rounded-lg text-xs font-bold transition-all hover:scale-110 ${
                                            val <= 6 ? 'bg-red-50 hover:bg-red-500 hover:text-white text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                                            val <= 8 ? 'bg-yellow-50 hover:bg-yellow-500 hover:text-white text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400' :
                                            'bg-emerald-50 hover:bg-emerald-500 hover:text-white text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                                        }`}
                                    >
                                        {val}
                                    </button>
                                ))}
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                                <span>Pouco Provável</span>
                                <span>Muito Provável</span>
                            </div>
                        </div>
                    )}

                    {step === 'feedback' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
                                {score! >= 9 ? <Smile className="w-5 h-5 text-emerald-500"/> : score! >= 7 ? <Meh className="w-5 h-5 text-yellow-500"/> : <Frown className="w-5 h-5 text-red-500"/>}
                                <span>Você deu nota {score}</span>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                O que motivou sua nota? (Opcional)
                            </p>
                            <textarea 
                                value={feedback}
                                onChange={e => setFeedback(e.target.value)}
                                className="w-full h-24 glass-input rounded-xl p-3 text-sm resize-none outline-none focus:ring-2 focus:ring-shinko-primary"
                                placeholder="Conte sua experiência..."
                                autoFocus
                            />
                            <button 
                                onClick={handleSubmit}
                                className="w-full py-2.5 bg-shinko-primary hover:bg-shinko-secondary text-white rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                Enviar Feedback <Send className="w-4 h-4"/>
                            </button>
                        </div>
                    )}

                    {step === 'thanks' && (
                        <div className="text-center py-6 animate-in zoom-in duration-300">
                            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                                <Smile className="w-8 h-8" />
                            </div>
                            <h4 className="text-xl font-bold text-slate-900 dark:text-white">Obrigado!</h4>
                            <p className="text-sm text-slate-500 mt-2">Seu feedback nos ajuda a construir um produto melhor.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
