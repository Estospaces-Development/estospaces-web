import { UK_COUNTRY_CODE, getSupportedLaunchCountry } from '@/lib/launchLocale';

export type ContractMarket = 'GB' | 'IN';

/** The contract's market from its property: UK only when the country or currency says so, India otherwise. */
export const resolveContractMarket = (propertyCountry?: string | null, propertyCurrency?: string | null): ContractMarket => {
    const country = getSupportedLaunchCountry(propertyCountry, propertyCountry);
    if (country) return country === UK_COUNTRY_CODE ? 'GB' : 'IN';
    return String(propertyCurrency || '').trim().toUpperCase() === 'GBP' ? 'GB' : 'IN';
};

/** Assured Shorthold Tenancy wording is England-only; India gets a plain rental agreement. */
export const getDefaultContractTerms = (market: ContractMarket): string => (
    market === 'GB'
        ? 'Standard Assured Shorthold Tenancy Agreement terms apply.'
        : 'Standard residential rental agreement terms apply, as agreed between the landlord and the tenant.'
);
