"use client";

import { useId, useMemo } from 'react';
import Select, { type SingleValue } from 'react-select';
import { X } from 'lucide-react';
import {
    findServiceAreaLabel,
    getServiceAreasForCountry,
    normalizeServiceAreaCode,
} from '@/lib/serviceAreaCatalog';

interface DispatchServiceAreaPickerProps {
    countryName?: string | null;
    selectedCodes: string[];
    onChange: (nextCodes: string[]) => void;
}

interface SelectOption {
    value: string;
    label: string;
}

export default function DispatchServiceAreaPicker({ countryName, selectedCodes, onChange }: DispatchServiceAreaPickerProps) {
    const instanceId = useId();
    const selectedSet = useMemo(
        () => new Set(selectedCodes.map((code) => normalizeServiceAreaCode(code))),
        [selectedCodes],
    );

    const catalog = getServiceAreasForCountry(countryName);
    const hasCatalog = catalog.length > 0;
    const options: SelectOption[] = catalog
        .filter((option) => !selectedSet.has(option.code))
        .map((option) => ({ value: option.code, label: `${option.area} (${option.code})` }));

    const handleSelect = (option: SingleValue<SelectOption>) => {
        if (!option) return;
        const code = normalizeServiceAreaCode(option.value);
        if (!code || selectedSet.has(code)) return;
        onChange([...selectedCodes, code]);
    };

    const handleRemove = (code: string) => {
        onChange(selectedCodes.filter((existing) => normalizeServiceAreaCode(existing) !== code));
    };

    return (
        <div>
            <Select<SelectOption>
                instanceId={instanceId}
                inputId="manager-service-areas"
                aria-label="Add a dispatch service area"
                value={null}
                options={options}
                onChange={handleSelect}
                isDisabled={!hasCatalog}
                isSearchable
                placeholder={hasCatalog ? 'Search or browse pincodes/postcodes...' : 'Set your country to add service areas'}
                noOptionsMessage={() => (hasCatalog ? 'No more areas to add' : 'No areas available')}
                classNamePrefix="service-area-select"
                unstyled
                classNames={{
                    control: (state) =>
                        `w-full rounded-lg border bg-gray-50 px-1 py-1 dark:bg-gray-700/50 ${
                            state.isFocused
                                ? 'border-orange-500 ring-2 ring-orange-500'
                                : 'border-gray-300 dark:border-gray-600'
                        }`,
                    placeholder: () => 'px-2 text-gray-400',
                    input: () => 'px-2 text-gray-900 dark:text-gray-100',
                    singleValue: () => 'px-2 text-gray-900 dark:text-gray-100',
                    indicatorsContainer: () => 'pr-1',
                    menu: () => 'mt-1 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800',
                    menuList: () => 'py-1 max-h-60',
                    option: (state) =>
                        `px-3 py-2 text-sm cursor-pointer ${
                            state.isFocused
                                ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                                : 'text-gray-900 dark:text-gray-100'
                        }`,
                    noOptionsMessage: () => 'px-3 py-2 text-sm text-gray-500 dark:text-gray-400',
                }}
            />

            {selectedCodes.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {selectedCodes.map((rawCode) => {
                        const code = normalizeServiceAreaCode(rawCode);
                        const area = findServiceAreaLabel(code, countryName);
                        return (
                            <span
                                key={code}
                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
                                    area
                                        ? 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/40 dark:bg-orange-900/20 dark:text-orange-300'
                                        : 'border-gray-200 bg-gray-100 text-gray-500 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-400'
                                }`}
                                title={area ? undefined : 'Added before the area picker existed — remove only'}
                            >
                                {area ? `${area} · ${code}` : code}
                                <button
                                    type="button"
                                    onClick={() => handleRemove(code)}
                                    className="rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
                                    aria-label={`Remove ${area ? `${area} (${code})` : code}`}
                                >
                                    <X size={12} />
                                </button>
                            </span>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
