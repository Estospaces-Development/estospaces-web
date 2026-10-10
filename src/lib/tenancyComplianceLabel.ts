// Mirrors booking's rightToRentLabel (internal/bookings/journey_state.go). Right to Rent is an England-only
// check, so an India or other non-UK rental must not ask the manager for it.
export function tenancyComplianceLabel(jurisdiction?: string | null): string {
    switch ((jurisdiction || '').trim().toLowerCase()) {
        // Booking treats a rental with no country, or "uk", as England.
        case '':
        case 'uk':
        case 'england':
            return 'Right to Rent';
        case 'wales':
            return 'Occupation contract / written statement';
        case 'scotland':
            return 'PRT / registration readiness';
        case 'northern_ireland':
            return 'Tenancy information notice';
        default:
            return 'Jurisdiction-specific tenancy compliance';
    }
}
