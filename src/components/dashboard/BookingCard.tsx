import React from 'react';
import { Calendar, Clock, MapPin, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import Badge from '../ui/Badge';

interface BookingCardProps {
    id: string;
    propertyTitle: string;
    propertyAddress: string;
    date: string;
    time: string;
    status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
    type: 'viewing' | 'inspection' | 'meeting';
    agentName?: string;
    onClick?: () => void;
    className?: string;
}

const statusConfig: Record<string, { variant: 'success' | 'warning' | 'error' | 'info'; icon: React.ElementType }> = {
    confirmed: { variant: 'success', icon: CheckCircle2 },
    pending: { variant: 'warning', icon: AlertCircle },
    cancelled: { variant: 'error', icon: XCircle },
    completed: { variant: 'info', icon: CheckCircle2 },
};

const BookingCard: React.FC<BookingCardProps> = ({
    propertyTitle,
    propertyAddress,
    date,
    time,
    status,
    type,
    agentName,
    onClick,
    className = '',
}) => {
    const config = statusConfig[status];
    const StatusIcon = config.icon;

    return (
        <div
            onClick={onClick}
            className={`bg-white dark:bg-black rounded-xl p-5 border border-gray-200 dark:border-zinc-800 hover:shadow-md transition-all duration-300 ${onClick ? 'cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-800' : ''} ${className}`}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">{propertyTitle}</h3>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{propertyAddress}</span>
                    </div>
                </div>
                <Badge variant={config.variant} dot>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                </Badge>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300 mb-3">
                <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>{date}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>{time}</span>
                </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-zinc-900">
                <Badge variant="outline" size="sm">
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                </Badge>
                {agentName && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        Agent: <span className="font-medium text-gray-700 dark:text-gray-300">{agentName}</span>
                    </span>
                )}
                <StatusIcon className={`w-4 h-4 ${status === 'confirmed' || status === 'completed' ? 'text-green-500' :
                        status === 'pending' ? 'text-amber-500' : 'text-red-500'
                    }`} />
            </div>
        </div>
    );
};

export default BookingCard;
