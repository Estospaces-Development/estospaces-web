import React from 'react';

import BrandLoader from './BrandLoader';

type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

interface SpinnerProps {
    size?: SpinnerSize;
    className?: string;
    label?: string;
}

const brandSizes: Record<SpinnerSize, 'sm' | 'md' | 'lg' | 'xl'> = {
    sm: 'sm',
    md: 'md',
    lg: 'lg',
    xl: 'xl',
};

const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '', label }) => {
    return (
        <BrandLoader
            size={brandSizes[size]}
            className={className}
            label={label || 'Loading'}
            showLabel={Boolean(label)}
        />
    );
};

export default Spinner;
