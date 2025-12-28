import React, { useState, useEffect } from 'react';
import { Opportunity } from '../types';
import { Dashboard } from '../components/Dashboard';
import { supabase } from '../services/supabaseClient';

interface Props {
    opportunities: Opportunity[];
    onOpenProject: (opp: Opportunity) => void;
    onNavigate: (view: string) => void;
    user: any;
    theme: 'light' | 'dark';
    onGuruPrompt?: (prompt: string) => void;
}

export const DashboardPage: React.FC<Props> = ({ opportunities, onOpenProject, onNavigate, user, theme, onGuruPrompt }) => {
    const [userData, setUserData] = useState<{ name: string } | undefined>();

    useEffect(() => {
        if (user) {
            supabase.from('users').select('nome').eq('id', user.id).single().then(({ data }) => {
                if (data) setUserData({ name: data.nome });
            });
        }
    }, [user]);

    return (
        <div className="h-full overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-transparent px-4 md:px-8 lg:px-12">
            <Dashboard 
                opportunities={opportunities} 
                onNavigate={onNavigate} 
                onOpenProject={onOpenProject} 
                user={user} 
                theme={theme} 
                userData={userData}
                onOpenCreate={() => onNavigate('create-project')}
                onGuruPrompt={onGuruPrompt}
            />
        </div>
    );
};