
import React from 'react';
import { ProfileScreen } from '../components/ProfileScreen';
import { User } from 'lucide-react';

interface Props {
    currentPlan: string;
    onRefresh: () => void;
}

export const ProfilePage: React.FC<Props> = ({ currentPlan, onRefresh }) => {
    return (
        <div className="h-full flex flex-col overflow-y-auto custom-scrollbar bg-white dark:bg-[#020203]">
            {/* Nubank-Style Header */}
            <header className="bg-[#F59E0B] -mx-4 md:-mx-12 px-8 pt-10 pb-8 md:px-12 md:pt-14 md:pb-12 mb-12 rounded-b-[3.5rem] shadow-xl relative z-50">
                <div className="max-w-5xl mx-auto flex flex-col gap-8">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/10">
                            <User className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Meu Perfil.</h2>
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white">
                            Terminal do Inovador
                        </h2>
                        <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em]">Configurações Pessoais e Conta</p>
                    </div>
                </div>
            </header>

            <div className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-0">
                <ProfileScreen currentPlan={currentPlan} onRefresh={onRefresh} />
            </div>
        </div>
    );
};
