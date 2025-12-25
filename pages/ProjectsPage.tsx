
import React from 'react';
import { Opportunity } from '../types';
import { ProjectList } from '../components/ProjectList';

interface Props {
    opportunities: Opportunity[];
    onOpenProject: (opp: Opportunity) => void;
    userRole: string;
    onRefresh: () => void;
}

export const ProjectsPage: React.FC<Props> = ({ opportunities, onOpenProject, userRole, onRefresh }) => {
    return (
        <div className="h-full p-4 md:p-8 overflow-y-auto custom-scrollbar">
            <ProjectList 
                opportunities={opportunities} 
                onOpenProject={onOpenProject} 
                userRole={userRole} 
                onRefresh={onRefresh} 
            />
        </div>
    );
};
