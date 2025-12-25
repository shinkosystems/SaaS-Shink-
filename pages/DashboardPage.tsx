
import React from 'react';
import { Opportunity } from '../types';
import { Dashboard } from '../components/Dashboard';

interface Props {
    opportunities: Opportunity[];
    onOpenProject: (opp: Opportunity) => void;
    onNavigate: (view: string) => void;
    user: any;
    theme: 'light' | 'dark';
}

export const DashboardPage: React.FC<Props> = ({ opportunities, onOpenProject, onNavigate, user, theme }) => {
    return (
        <div className="h-full p-4 md:p-8 overflow-y-auto custom-scrollbar">
            <Dashboard 
                opportunities={opportunities} 
                onNavigate={onNavigate} 
                onOpenProject={onOpenProject} 
                user={user} 
                theme={theme} 
            />
        </div>
    );
};
