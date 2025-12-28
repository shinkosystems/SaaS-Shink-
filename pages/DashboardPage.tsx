
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
}

export const DashboardPage: React.FC<Props> = ({ opportunities, onOpenProject, onNavigate, user, theme }) => {
    const [userData, setUserData] = useState<{ name: string } | undefined>();

    useEffect(() => {
        if (user) {
            supabase.from('users').select('nome').eq('id', user.id).single().then(({ data }) => {
                if (data) setUserData({ name: data.nome });
            });
        }
    }, [user]);

    return (
        <div className="h-full overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-transparent px-4">
            <Dashboard 
                opportunities={opportunities} 
                onNavigate={onNavigate} 
                onOpenProject={onOpenProject} 
                user={user} 
                theme={theme} 
                userData={userData}
                onOpenCreate={() => onNavigate('create-project')}
            />
        </div>
    );
};
