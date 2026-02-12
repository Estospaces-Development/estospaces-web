'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Appointment {
    id: string;
    clientName: string;
    date: string;
    time: string;
    description: string;
    status: string;
}

interface CalendarProps {
    appointments: Appointment[];
    onDateClick?: (date: Date) => void;
    onAppointmentClick?: (appointment: Appointment) => void;
}

const Calendar = ({ appointments, onDateClick, onAppointmentClick }: CalendarProps) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay();

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
    ];

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const goToPreviousMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const goToNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const goToToday = () => setCurrentDate(new Date());

    const getAppointmentsForDate = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        return appointments.filter((apt) => apt.date === dateStr);
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return (
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        );
    };

    const handleDateClick = (day: number) => {
        const clickedDate = new Date(year, month, day);
        if (onDateClick) onDateClick(clickedDate);
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={goToPreviousMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                        <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                        {monthNames[month]} {year}
                    </h2>
                    <button onClick={goToNextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                        <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                </div>
                <button onClick={goToToday} className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors">
                    Today
                </button>
            </div>

            {/* Day Names */}
            <div className="grid grid-cols-7 gap-2 mb-2">
                {dayNames.map((day) => (
                    <div key={day} className="text-center text-sm font-semibold text-gray-600 dark:text-gray-400 py-2">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: startingDayOfWeek }).map((_, index) => (
                    <div key={`empty-${index}`} className="aspect-square"></div>
                ))}

                {Array.from({ length: daysInMonth }).map((_, index) => {
                    const day = index + 1;
                    const date = new Date(year, month, day);
                    const dayAppointments = getAppointmentsForDate(date);
                    const isCurrentDay = isToday(date);

                    return (
                        <div
                            key={day}
                            onClick={() => handleDateClick(day)}
                            className={`aspect-square border border-gray-200 dark:border-gray-800 rounded-lg p-2 cursor-pointer transition-all hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 ${isCurrentDay ? 'bg-primary/10 border-primary dark:bg-primary/20' : 'bg-white dark:bg-gray-800/50'
                                }`}
                        >
                            <div className="flex flex-col h-full">
                                <div className={`text-sm font-medium mb-1 ${isCurrentDay ? 'text-primary' : 'text-gray-800 dark:text-gray-200'}`}>
                                    {day}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    {dayAppointments.slice(0, 2).map((apt) => (
                                        <div
                                            key={apt.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (onAppointmentClick) onAppointmentClick(apt);
                                            }}
                                            className={`text-xs p-1 mb-1 rounded truncate cursor-pointer ${apt.status === 'Confirmed'
                                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                                                    : apt.status === 'Pending'
                                                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                                                        : apt.status === 'Completed'
                                                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                                                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                                                }`}
                                            title={apt.clientName}
                                        >
                                            {apt.time} - {apt.clientName}
                                        </div>
                                    ))}
                                    {dayAppointments.length > 2 && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            +{dayAppointments.length - 2} more
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Calendar;
