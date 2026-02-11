"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { MapPin, ChevronDown, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import {
    getCountries,
    getStatesByCountry,
    getCitiesByState,
    resolveAddressToIds,
    type Country,
    type State,
    type City,
} from '../../services/addressService';

export interface AddressFormData {
    countryId: string;
    countryName: string;
    countryCode: string;
    stateId: string;
    stateName: string;
    stateCode: string;
    cityId: string;
    cityName: string;
    addressLine1: string;
    addressLine2: string;
    postalCode: string;
    neighborhood: string;
    landmark: string;
}

interface AddressSectionProps {
    value: AddressFormData;
    onChange: (data: AddressFormData) => void;
    errors?: Record<string, string>;
    disabled?: boolean;
    required?: boolean;
    // For edit mode - existing values to preload
    initialCountry?: string;
    initialCountryCode?: string;
    initialState?: string;
    initialCity?: string;
}

const AddressSection = ({
    value,
    onChange,
    errors = {},
    disabled = false,
    required = true,
    initialCountry,
    initialCountryCode,
    initialState,
    initialCity,
}: AddressSectionProps) => {
    // Data states
    const [countries, setCountries] = useState<Country[]>([]);
    const [states, setStates] = useState<State[]>([]);
    const [cities, setCities] = useState<City[]>([]);

    // Loading states
    const [loadingCountries, setLoadingCountries] = useState(true);
    const [loadingStates, setLoadingStates] = useState(false);
    const [loadingCities, setLoadingCities] = useState(false);

    // Error states
    const [countryError, setCountryError] = useState<string | null>(null);
    const [stateError, setStateError] = useState<string | null>(null);
    const [cityError, setCityError] = useState<string | null>(null);

    // Track if we've initialized with IDs to avoid re-initialization
    const initializedRef = useRef<string | null>(null);
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);

    // Load countries on mount
    useEffect(() => {
        const loadCountries = async () => {
            setLoadingCountries(true);
            setCountryError(null);

            const { data, error } = await getCountries();

            if (error) {
                setCountryError(error);
                setLoadingCountries(false);
                return;
            }

            setCountries(data || []);
            setLoadingCountries(false);
        };

        loadCountries();
    }, []);

    // Initialize with IDs when countries are loaded and we have IDs
    useEffect(() => {
        const initializeWithIds = async () => {
            // Skip if countries not loaded
            if (!countries.length) return;

            // Case 1: We have IDs - load dependent data and populate names
            if (value.countryId) {
                const idKey = `${value.countryId}-${value.stateId || ''}-${value.cityId || ''}`;

                // Skip if already initialized for these IDs
                if (initializedRef.current === idKey) return;

                const country = countries.find(c => c.id === value.countryId);
                if (country) {
                    // Load states for this country
                    const { data: statesData } = await getStatesByCountry(value.countryId);
                    if (statesData) {
                        setStates(statesData);

                        // If we have stateId, load cities
                        let citiesData = null;
                        if (value.stateId) {
                            const citiesResult = await getCitiesByState(value.stateId);
                            if (citiesResult.data) {
                                citiesData = citiesResult.data;
                                setCities(citiesData);
                            }
                        }

                        // Update form with names if missing (keep IDs)
                        const state = statesData.find(s => s.id === value.stateId);
                        const city = citiesData?.find(c => c.id === value.cityId);

                        const needsUpdate = !value.countryName ||
                            (value.stateId && !value.stateName) ||
                            (value.cityId && !value.cityName);

                        if (needsUpdate) {
                            onChange({
                                ...value,
                                countryName: country.name,
                                countryCode: country.code || value.countryCode,
                                stateName: state?.name || value.stateName || '',
                                stateCode: state?.code || value.stateCode || '',
                                cityName: city?.name || value.cityName || '',
                            });
                        }
                        initializedRef.current = idKey;
                        setInitialLoadComplete(true);
                    }
                }
                return;
            }

            // Case 2: We have names but no IDs - resolve them from names (only once)
            if ((initialCountry || initialCountryCode) && !value.countryId && initialCountry && !initialLoadComplete) {
                const { countryId, stateId, cityId } = await resolveAddressToIds(
                    initialCountry,
                    initialCountryCode,
                    initialState,
                    initialCity
                );

                if (countryId) {
                    const country = countries.find(c => c.id === countryId);
                    if (country) {
                        const { data: statesData } = await getStatesByCountry(countryId);
                        if (statesData) {
                            setStates(statesData);

                            if (stateId) {
                                const { data: citiesData } = await getCitiesByState(stateId);
                                if (citiesData) {
                                    setCities(citiesData);
                                }
                            }
                        }

                        const state = statesData?.find(s => s.id === stateId);
                        const cityData = stateId ? (await getCitiesByState(stateId)).data : null;
                        const city = cityData?.find(c => c.id === cityId);

                        onChange({
                            ...value,
                            countryId,
                            countryName: country.name,
                            countryCode: country.code,
                            stateId: stateId || '',
                            stateName: state?.name || initialState || '',
                            stateCode: state?.code || '',
                            cityId: cityId || '',
                            cityName: city?.name || initialCity || '',
                        });

                        const resolvedIdKey = `${countryId}-${stateId || ''}-${cityId || ''}`;
                        initializedRef.current = resolvedIdKey;
                    }
                }
                setInitialLoadComplete(true);
            } else if (!value.countryId && !initialCountry) {
                setInitialLoadComplete(true);
            }
        };

        initializeWithIds();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [countries.length, value.countryId, value.stateId, value.cityId]);

    // Load states when country changes (runs after initialization)
    useEffect(() => {
        const loadStates = async () => {
            if (!value.countryId) {
                setStates([]);
                setCities([]);
                return;
            }

            // Skip if countries not loaded yet
            if (countries.length === 0) return;

            // Skip if states already loaded for this country
            const country = countries.find(c => c.id === value.countryId);
            if (country && states.length > 0) {
                // States already loaded, just ensure cities are loaded if we have stateId
                if (value.stateId && cities.length === 0) {
                    const { data: citiesData } = await getCitiesByState(value.stateId);
                    if (citiesData) {
                        setCities(citiesData);
                    }
                }
                return;
            }

            // Don't reload if initialization is handling it
            const idKey = `${value.countryId}-${value.stateId || ''}-${value.cityId || ''}`;
            if (initializedRef.current === idKey && initialLoadComplete) {
                return;
            }

            setLoadingStates(true);
            setStateError(null);

            const { data, error } = await getStatesByCountry(value.countryId);

            if (error) {
                setStateError(error);
                setLoadingStates(false);
                return;
            }

            setStates(data || []);
            setLoadingStates(false);

            // If we have a stateId, load cities for that state
            if (value.stateId && (data?.length ?? 0) > 0) {
                const { data: citiesData, error: citiesError } = await getCitiesByState(value.stateId);
                if (!citiesError && citiesData) {
                    setCities(citiesData);
                }
            }
        };

        // Only load if countries are available and we have a countryId
        if (countries.length > 0 && value.countryId) {
            loadStates();
        }
    }, [value.countryId, countries.length]);

    // Load cities when state changes (including when initialized with ID)
    useEffect(() => {
        let isMounted = true;

        const loadCities = async () => {
            if (!value.stateId) {
                if (isMounted) {
                    setCities([]);
                    setLoadingCities(false);
                }
                return;
            }

            // Skip if cities already loaded for this state
            if (cities.length > 0) {
                // Check if current cities list is for this state
                const state = states.find(s => s.id === value.stateId);
                if (state) {
                    // Cities already loaded, skip
                    return;
                }
            }

            // Wait for states to be loaded
            if (states.length === 0 || !states.find(s => s.id === value.stateId)) {
                // States not loaded yet for this state, wait
                return;
            }

            if (isMounted) {
                setLoadingCities(true);
                setCityError(null);
            }

            const { data, error } = await getCitiesByState(value.stateId);

            if (!isMounted) return;

            if (error) {
                setCityError(error);
                setLoadingCities(false);
                return;
            }

            if (isMounted) {
                setCities(data || []);
                setLoadingCities(false);
            }
        };

        // Only load cities if we have stateId and states are loaded
        if (value.stateId && states.length > 0) {
            loadCities();
        }

        return () => {
            isMounted = false;
        };
    }, [value.stateId, states.length]);

    // Handlers
    const handleCountryChange = useCallback((countryId: string) => {
        const country = countries.find(c => c.id === countryId);

        onChange({
            ...value,
            countryId,
            countryName: country?.name || '',
            countryCode: country?.code || '',
            // Clear dependent fields
            stateId: '',
            stateName: '',
            stateCode: '',
            cityId: '',
            cityName: '',
        });

        // Clear states and cities
        setStates([]);
        setCities([]);
    }, [countries, value, onChange]);

    const handleStateChange = useCallback((stateId: string) => {
        const state = states.find(s => s.id === stateId);

        // Clear cities first before updating state
        setCities([]);

        onChange({
            ...value,
            stateId,
            stateName: state?.name || '',
            stateCode: state?.code || '',
            // Clear dependent fields
            cityId: '',
            cityName: '',
        });
    }, [states, value, onChange]);

    const handleCityChange = useCallback((cityId: string) => {
        const city = cities.find(c => c.id === cityId);

        onChange({
            ...value,
            cityId,
            cityName: city?.name || '',
        });
    }, [cities, value, onChange]);

    const handleTextChange = useCallback((field: keyof AddressFormData, fieldValue: string) => {
        onChange({
            ...value,
            [field]: fieldValue,
        });
    }, [value, onChange]);

    // Handler for postal code - only allows integers
    const handlePostalCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        // Only allow digits (0-9)
        const numericValue = inputValue.replace(/\D/g, '');
        handleTextChange('postalCode', numericValue);
    }, [handleTextChange]);

    // Retry handlers
    const retryCountries = useCallback(async () => {
        setLoadingCountries(true);
        setCountryError(null);
        const { data, error } = await getCountries();
        if (error) {
            setCountryError(error);
        } else {
            setCountries(data || []);
        }
        setLoadingCountries(false);
    }, []);

    const retryStates = useCallback(async () => {
        if (!value.countryId) return;
        setLoadingStates(true);
        setStateError(null);
        const { data, error } = await getStatesByCountry(value.countryId);
        if (error) {
            setStateError(error);
        } else {
            setStates(data || []);
        }
        setLoadingStates(false);
    }, [value.countryId]);

    const retryCities = useCallback(async () => {
        if (!value.stateId) return;
        setLoadingCities(true);
        setCityError(null);
        const { data, error } = await getCitiesByState(value.stateId);
        if (error) {
            setCityError(error);
        } else {
            setCities(data || []);
        }
        setLoadingCities(false);
    }, [value.stateId]);

    // Computed values
    const isStateDisabled = useMemo(() => {
        return disabled || !value.countryId || loadingStates;
    }, [disabled, value.countryId, loadingStates]);

    const isCityDisabled = useMemo(() => {
        return disabled || !value.stateId || loadingCities;
    }, [disabled, value.stateId, loadingCities]);

    // Render dropdown with loading and error states
    const renderSelect = (
        id: string,
        label: string,
        value: string,
        options: { id: string; name: string }[],
        onChange: (value: string) => void,
        isLoading: boolean,
        isDisabled: boolean,
        error: string | null,
        onRetry: () => void,
        placeholder: string,
        validationError?: string
    ) => (
        <div>
            <label
                htmlFor={id}
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
                <select
                    id={id}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={isDisabled || isLoading}
                    className={`
            w-full px-3 py-2.5 pr-10 appearance-none
            border rounded-lg
            bg-white dark:bg-gray-800
            text-gray-900 dark:text-gray-100
            focus:ring-2 focus:ring-primary focus:border-primary
            disabled:bg-gray-100 dark:disabled:bg-gray-900
            disabled:text-gray-500 dark:disabled:text-gray-500
            disabled:cursor-not-allowed
            transition-colors duration-200
            ${validationError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'}
          `}
                >
                    <option value="">{isLoading ? 'Loading...' : placeholder}</option>
                    {options.map((option) => (
                        <option key={option.id} value={option.id}>
                            {option.name}
                        </option>
                    ))}
                </select>

                {/* Dropdown icon or loading spinner */}
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                </div>
            </div>

            {/* Error message with retry */}
            {error && (
                <div className="mt-1 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                    <button
                        type="button"
                        onClick={onRetry}
                        className="ml-2 flex items-center gap-1 text-primary hover:underline"
                    >
                        <RefreshCw className="w-3 h-3" />
                        Retry
                    </button>
                </div>
            )}

            {/* Validation error */}
            {validationError && !error && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationError}</p>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Section Header */}
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                <MapPin className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Address Details
                </h3>
            </div>

            {/* Country, State, City Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Country */}
                {renderSelect(
                    'country',
                    'Country',
                    value.countryId,
                    countries,
                    handleCountryChange,
                    loadingCountries,
                    disabled,
                    countryError,
                    retryCountries,
                    'Select Country',
                    errors.country
                )}

                {/* State */}
                {renderSelect(
                    'state',
                    'State / Province',
                    value.stateId,
                    states,
                    handleStateChange,
                    loadingStates,
                    isStateDisabled,
                    stateError,
                    retryStates,
                    value.countryId ? 'Select State' : 'Select Country first',
                    errors.state
                )}

                {/* City */}
                {renderSelect(
                    'city',
                    'City',
                    value.cityId,
                    cities,
                    handleCityChange,
                    loadingCities,
                    isCityDisabled,
                    cityError,
                    retryCities,
                    value.stateId ? 'Select City' : 'Select State first',
                    errors.city
                )}
            </div>

            {/* Address Lines */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Address Line 1 */}
                <div>
                    <label
                        htmlFor="addressLine1"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                        Street Address {required && <span className="text-red-500">*</span>}
                    </label>
                    <input
                        id="addressLine1"
                        type="text"
                        value={value.addressLine1}
                        onChange={(e) => handleTextChange('addressLine1', e.target.value)}
                        disabled={disabled}
                        placeholder="Enter street address"
                        className={`
              w-full px-3 py-2.5
              border rounded-lg
              bg-white dark:bg-gray-800
              text-gray-900 dark:text-gray-100
              placeholder-gray-400 dark:placeholder-gray-500
              focus:ring-2 focus:ring-primary focus:border-primary
              disabled:bg-gray-100 dark:disabled:bg-gray-900
              disabled:cursor-not-allowed
              transition-colors duration-200
              ${errors.addressLine1 ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
            `}
                    />
                    {errors.addressLine1 && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.addressLine1}</p>
                    )}
                </div>

                {/* Address Line 2 */}
                <div>
                    <label
                        htmlFor="addressLine2"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                        Address Line 2
                    </label>
                    <input
                        id="addressLine2"
                        type="text"
                        value={value.addressLine2}
                        onChange={(e) => handleTextChange('addressLine2', e.target.value)}
                        disabled={disabled}
                        placeholder="Apartment, suite, unit, etc. (optional)"
                        className="
              w-full px-3 py-2.5
              border border-gray-300 dark:border-gray-600 rounded-lg
              bg-white dark:bg-gray-800
              text-gray-900 dark:text-gray-100
              placeholder-gray-400 dark:placeholder-gray-500
              focus:ring-2 focus:ring-primary focus:border-primary
              disabled:bg-gray-100 dark:disabled:bg-gray-900
              disabled:cursor-not-allowed
              transition-colors duration-200
            "
                    />
                </div>
            </div>

            {/* Postal Code, Neighborhood, Landmark */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Postal Code */}
                <div>
                    <label
                        htmlFor="postalCode"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                        Postal / ZIP Code {required && <span className="text-red-500">*</span>}
                    </label>
                    <input
                        id="postalCode"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={value.postalCode}
                        onChange={handlePostalCodeChange}
                        disabled={disabled}
                        placeholder="Enter postal code"
                        className={`
              w-full px-3 py-2.5
              border rounded-lg
              bg-white dark:bg-gray-800
              text-gray-900 dark:text-gray-100
              placeholder-gray-400 dark:placeholder-gray-500
              focus:ring-2 focus:ring-primary focus:border-primary
              disabled:bg-gray-100 dark:disabled:bg-gray-900
              disabled:cursor-not-allowed
              transition-colors duration-200
              ${errors.postalCode ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
            `}
                    />
                    {errors.postalCode && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.postalCode}</p>
                    )}
                </div>

                {/* Neighborhood */}
                <div>
                    <label
                        htmlFor="neighborhood"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                        Neighborhood
                    </label>
                    <input
                        id="neighborhood"
                        type="text"
                        value={value.neighborhood}
                        onChange={(e) => handleTextChange('neighborhood', e.target.value)}
                        disabled={disabled}
                        placeholder="Enter neighborhood (optional)"
                        className="
              w-full px-3 py-2.5
              border border-gray-300 dark:border-gray-600 rounded-lg
              bg-white dark:bg-gray-800
              text-gray-900 dark:text-gray-100
              placeholder-gray-400 dark:placeholder-gray-500
              focus:ring-2 focus:ring-primary focus:border-primary
              disabled:bg-gray-100 dark:disabled:bg-gray-900
              disabled:cursor-not-allowed
              transition-colors duration-200
            "
                    />
                </div>

                {/* Landmark */}
                <div>
                    <label
                        htmlFor="landmark"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                        Nearby Landmark
                    </label>
                    <input
                        id="landmark"
                        type="text"
                        value={value.landmark}
                        onChange={(e) => handleTextChange('landmark', e.target.value)}
                        disabled={disabled}
                        placeholder="Enter nearby landmark (optional)"
                        className="
              w-full px-3 py-2.5
              border border-gray-300 dark:border-gray-600 rounded-lg
              bg-white dark:bg-gray-800
              text-gray-900 dark:text-gray-100
              placeholder-gray-400 dark:placeholder-gray-500
              focus:ring-2 focus:ring-primary focus:border-primary
              disabled:bg-gray-100 dark:disabled:bg-gray-900
              disabled:cursor-not-allowed
              transition-colors duration-200
            "
                    />
                </div>
            </div>

            {/* Empty states info */}
            {value.countryId && states.length === 0 && !loadingStates && !stateError && (
                <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    No states/provinces available for selected country. You can enter the state name manually.
                </p>
            )}

            {value.stateId && cities.length === 0 && !loadingCities && !cityError && (
                <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    No cities available for selected state. You can enter the city name manually.
                </p>
            )}
        </div>
    );
};

export default AddressSection;
