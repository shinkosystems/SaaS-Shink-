
import React from 'react';
import { FinancialScreen } from '../components/FinancialScreen';

interface Props {
    orgType?: string;
}

export const FinancialPage: React.FC<Props> = ({ orgType }) => {
    return (
        <div className="w-full min-h-full bg-transparent">
            <FinancialScreen orgType={orgType} />
        </div>
    );
};
