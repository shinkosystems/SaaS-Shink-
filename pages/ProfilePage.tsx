import React from 'react';
import { ProfileScreen } from '../components/ProfileScreen';

interface Props {
    currentPlan: string;
    onRefresh: () => void;
}

export const ProfilePage: React.FC<Props> = ({ currentPlan, onRefresh }) => {
    return (
        <div className="h-full p-6 md:p-10 flex flex-col overflow-y-auto custom-scrollbar">
            <header className="mb-12 max-w-4xl mx-auto w-full">
                <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                    Meu <span className="text-amber-500">Perfil</span>.
                </h1>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-2">Dados pessoais e gerenciamento de conta</p>
            </header>
            <div className="flex-1">
                <ProfileScreen currentPlan={currentPlan} onRefresh={onRefresh} />
            </div>
        </div>
    );
};
