
import React from 'react';
import { Opportunity } from '../types';
import { ProjectList } from '../components/ProjectList';

interface Props {
    opportunities: Opportunity[];
    onOpenProject: (opp: Opportunity) => void;
    userRole: string;
    onRefresh: () => void;
    onOpenCreate?: () => void;
}

export const ProjectsPage: React.FC<Props> = ({ opportunities, onOpenProject, userRole, onRefresh, onOpenCreate }) => {
    return (
        <div className="h-full p-6 md:p-12 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-transparent">
            <ProjectList 
                opportunities={opportunities} 
                onOpenProject={onOpenProject} 
                userRole={userRole} 
                onRefresh={onRefresh}
                onOpenCreate={onOpenCreate}
            />
        </div>
    );
};
