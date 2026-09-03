"use client";

import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
    label?: string;
    className?: string;
}

const BackButton = ({ label = 'Back', className = '' }: BackButtonProps) => {
    const navigate = useNavigate();

    return (
        <button
            onClick={() => navigate(-1)}
            className={`flex min-h-12 min-w-12 items-center gap-2 rounded-xl px-2 text-gray-800 transition-colors hover:text-gray-950 dark:text-gray-200 dark:hover:text-white ${className}`}
        >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">{label}</span>
        </button>
    );
};

export default BackButton;

