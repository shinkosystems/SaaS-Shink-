
import React, { useState, useEffect } from 'react';
import { Opportunity } from '../types';
import { Dashboard } from '../components/Dashboard';
import { supabase } from '../services/supabaseClient';
import { fetchActiveOrgModules } from '../services/organizationService';

interface Props {
    opportunities: Opportunity[];
    onOpenProject: (opp: Opportunity) => void;
    onNavigate: (view: string) => void;
    user: any;
    theme: 'light' | 'dark';
    onGuruPrompt?: (prompt: string) => void;
}

export const DashboardPage: React.FC<Props> = ({ opportunities, onOpenProject, onNavigate, user, theme, onGuruPrompt }) => {
    const [userData, setUserData] = useState<{ name: string, role: string } | undefined>();
    const [billingDate, setBillingDate] = useState<string | undefined>();
    const [activeModules, setActiveModules] = useState<string[]>([]);

    useEffect(() => {
        if (user) {
            // Load Basic User Info
            supabase.from('users').select('nome, organizacao, perfil').eq('id', user.id).single().then(({ data }) => {
                if (data) {
                    setUserData({ name: data.nome, role: data.perfil });
                    if (data.organizacao) {
                        // Load Organization Billing Date
                        supabase.from('organizacoes').select('vencimento').eq('id', data.organizacao).single().then(({ data: orgData }) => {
                            if (orgData?.vencimento) setBillingDate(orgData.vencimento);
                        });
                        // Load Active Modules
                        fetchActiveOrgModules(data.organizacao).then(setActiveModules);
                    }
                }
            });
        }
    }, [user]);

    return (
        <div className="h-full overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-transparent animate-page-enter">
            <Dashboard 
                opportunities={opportunities} 
                onNavigate={onNavigate} 
                onOpenProject={onOpenProject} 
                user={user} 
                theme={theme} 
                userData={userData}
                onOpenCreate={() => onNavigate('create-project')}
                onGuruPrompt={onGuruPrompt}
                billingDate={billingDate}
                activeModules={activeModules}
                userRole={userData?.role}
            />
        </div>
    );
};
