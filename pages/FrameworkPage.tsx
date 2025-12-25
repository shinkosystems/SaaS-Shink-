
import React from 'react';
import { FrameworkExplorer } from '../components/FrameworkExplorer';
import { Opportunity } from '../types';

interface Props {
    orgName: string;
    onBack: () => void;
    onSaveToProject: (opp: Opportunity) => void;
}

export const FrameworkPage: React.FC<Props> = ({ orgName, onBack, onSaveToProject }) => {
    return (
        <FrameworkExplorer 
            orgType={orgName} 
            onBack={onBack}
            onSaveToProject={onSaveToProject} 
        />
    );
};
