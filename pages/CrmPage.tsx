import React from 'react';
import { CrmBoard } from '../components/CrmBoard';

interface Props {
    organizationId?: number;
}

export const CrmPage: React.FC<Props> = ({ organizationId }) => {
    return (
        <div className="h-full p-6 md:p-10 flex flex-col overflow-hidden">
            <header className="mb-8">
                <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                    Pipeline de <span className="text-amber-500">Vendas</span>.
                </h1>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-2">Gestão comercial e prospecção ativa</p>
            </header>
            <div className="flex-1 overflow-hidden">
                <CrmBoard organizationId={organizationId} />
            </div>
        </div>
    );
};
