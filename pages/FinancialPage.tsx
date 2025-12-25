import React from 'react';
import { FinancialScreen } from '../components/FinancialScreen';

interface Props {
    orgType?: string;
}

export const FinancialPage: React.FC<Props> = ({ orgType }) => {
    return (
        <div className="h-full p-6 md:p-10 flex flex-col overflow-hidden">
            <header className="mb-8">
                <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                    Saúde <span className="text-amber-500">Financeira</span>.
                </h1>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-2">Fluxo de caixa, MRR e rentabilidade</p>
            </header>
            <div className="flex-1 overflow-hidden">
                <FinancialScreen orgType={orgType} />
            </div>
        </div>
    );
};
