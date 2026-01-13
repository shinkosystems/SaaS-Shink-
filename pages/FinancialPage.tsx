
import React from 'react';
import { FinancialScreen } from '../components/FinancialScreen';

interface Props {
    orgType?: string;
}

export const FinancialPage: React.FC<Props> = ({ orgType }) => {
    return (
        <div className="h-full overflow-y-auto custom-scrollbar bg-transparent">
            <FinancialScreen orgType={orgType} />
        </div>
    );
};
