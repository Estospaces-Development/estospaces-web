import React from 'react';

import { MANAGER_COUNTRY_LOCKED_HINT, MANAGER_PROFILE_COUNTRIES } from '@/lib/managerProfileCountry';

interface ManagerCountryFieldProps {
    value: string;
    // Verification is approved: the country can only be changed through support.
    locked: boolean;
    // The verification status has not loaded yet, so editability is unknown.
    disabled: boolean;
    onChange: React.ChangeEventHandler<HTMLSelectElement>;
}

export default function ManagerCountryField({ value, locked, disabled, onChange }: ManagerCountryFieldProps) {
    const isDisabled = locked || disabled;
    return (
        <div>
            <label htmlFor="manager-country" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Country</label>
            <select
                id="manager-country"
                name="country"
                value={value}
                onChange={onChange}
                disabled={isDisabled}
                aria-describedby="manager-country-hint"
                className={`w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg ${isDisabled
                    ? 'bg-gray-100 dark:bg-gray-700/30 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500'}`}
            >
                {!value && <option value="">Select country</option>}
                {MANAGER_PROFILE_COUNTRIES.map((country) => (
                    <option key={country} value={country}>{country}</option>
                ))}
            </select>
            <p id="manager-country-hint" className="text-xs text-gray-500 mt-1">
                {locked ? MANAGER_COUNTRY_LOCKED_HINT : 'You can change this until your verification is approved.'}
            </p>
        </div>
    );
}
