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
            className={`flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors ${className}`}
        >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">{label}</span>
        </button>
    );
};

export default BackButton;

