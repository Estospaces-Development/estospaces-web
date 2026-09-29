export const PAYMENTS_ENABLED = true;
export const VIRTUAL_TOUR_ENABLED = false;
// Core does not serve /api/v1/admin/research/* yet, so the admin Research
// workspace is hidden. Set to true once those routes are deployed. Keep it a
// plain literal: scripts/admin-research-availability.cjs reads it.
export const ADMIN_RESEARCH_ENABLED = false;
