import React from 'react';
import { Mail, Phone, Shield, ShieldCheck, ShieldAlert } from 'lucide-react';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';

interface UserCardProps {
    name: string;
    email: string;
    phone?: string;
    role: 'user' | 'manager' | 'admin' | 'broker';
    avatarUrl?: string;
    verified?: boolean;
    status?: 'active' | 'pending' | 'suspended';
    joinedDate?: string;
    onClick?: () => void;
    className?: string;
}

const roleConfig: Record<string, { variant: 'info' | 'success' | 'warning' | 'error'; icon: React.ElementType }> = {
    admin: { variant: 'error', icon: Shield },
    manager: { variant: 'info', icon: ShieldCheck },
    broker: { variant: 'warning', icon: ShieldAlert },
    user: { variant: 'success', icon: Shield },
};

const UserCard: React.FC<UserCardProps> = ({
    name,
    email,
    phone,
    role,
    avatarUrl,
    verified = false,
    status = 'active',
    joinedDate,
    onClick,
    className = '',
}) => {
    const config = roleConfig[role] || roleConfig.user;
    const RoleIcon = config.icon;

    return (
        <div
            onClick={onClick}
            className={`bg-white dark:bg-black rounded-xl p-5 border border-gray-200 dark:border-zinc-800 hover:shadow-md transition-all duration-300 ${onClick ? 'cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-800' : ''} ${className}`}
        >
            <div className="flex items-start gap-4">
                <Avatar src={avatarUrl} name={name} size="lg" status={status === 'active' ? 'online' : status === 'pending' ? 'away' : 'offline'} />

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">{name}</h3>
                        {verified && (
                            <ShieldCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        )}
                    </div>

                    <div className="space-y-1 mb-3">
                        <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                            <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{email}</span>
                        </div>
                        {phone && (
                            <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                                <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>{phone}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={config.variant} size="sm">
                            <RoleIcon className="w-3 h-3" />
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                        </Badge>
                        <Badge
                            variant={status === 'active' ? 'success' : status === 'pending' ? 'warning' : 'error'}
                            size="sm"
                            dot
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Badge>
                        {joinedDate && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">Joined {joinedDate}</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserCard;
