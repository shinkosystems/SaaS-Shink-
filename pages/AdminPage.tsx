import React from 'react';
import { AdminManagerScreen } from '../components/AdminManagerScreen';

interface Props {
    onlineUsers?: string[];
}

export const AdminPage: React.FC<Props> = ({ onlineUsers }) => {
    return (
        <div className="h-full p-4 md:p-8 overflow-y-auto custom-scrollbar">
            <AdminManagerScreen onlineUsers={onlineUsers} />
        </div>
    );
};
