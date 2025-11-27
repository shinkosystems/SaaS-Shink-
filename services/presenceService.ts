
import { supabase } from './supabaseClient';

export const subscribeToPresence = (userId: string, onSync: (onlineUserIds: string[]) => void) => {
    const channel = supabase.channel('online-users', {
        config: {
            presence: {
                key: userId,
            },
        },
    });

    channel
        .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            // The state object keys are the userIds because we set 'key: userId' in config
            const onlineIds = Object.keys(state);
            onSync(onlineIds);
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({ 
                    online_at: new Date().toISOString(),
                    user_id: userId 
                });
            }
        });

    return () => {
        supabase.removeChannel(channel);
    };
};
