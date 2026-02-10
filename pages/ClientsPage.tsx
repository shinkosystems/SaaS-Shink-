
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
        <div className="h-full p-6 md:p-10 flex flex-col overflow-hidden bg-transparent">
            <div className="flex-1 overflow-y-auto custom-scrollbar no-scrollbar">
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
