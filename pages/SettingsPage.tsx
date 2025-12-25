import React from 'react';
import { SettingsScreen } from '../components/SettingsScreen';

interface Props {
    theme: 'dark' | 'light';
    onToggleTheme: () => void;
    onlineUsers: string[];
    userOrgId: number | null;
    orgDetails: any;
    onUpdateOrgDetails: (updates: any) => Promise<void> | void;
    setView: (view: any) => void;
    userRole: string;
    userData: any;
    currentPlan?: string;
    activeModules: string[];
    onRefreshModules: () => void;
    initialTab?: 'general' | 'team' | 'ai' | 'modules';
}

export const SettingsPage: React.FC<Props> = (props) => {
    return (
        <div className="h-full p-4 md:p-8 overflow-y-auto custom-scrollbar">
            <SettingsScreen {...props} />
        </div>
    );
};
