import React from 'react';
import { ClientsScreen } from '../components/ClientsScreen';

interface Props {
    userRole?: string;
    onlineUsers?: string[];
    organizationId?: number;
    onOpenProject?: (project: any) => void;
}

export const ClientsPage: React.FC<Props> = ({ userRole, onlineUsers, organizationId, onOpenProject }) => {
    return (
        <div className="h-full p-6 md:p-10 flex flex-col overflow-hidden">
            <header className="mb-8">
                <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                    Base de <span className="text-amber-500">Stakeholders</span>.
                </h1>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-2">Gestão de parceiros e acessos externos</p>
            </header>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <ClientsScreen 
                    userRole={userRole} 
                    onlineUsers={onlineUsers} 
                    organizationId={organizationId} 
                    onOpenProject={onOpenProject} 
                />
            </div>
        </div>
    );
};