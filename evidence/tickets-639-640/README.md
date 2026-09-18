# Tickets #639 and #640 runtime proof

- Environment: GCP development
- Serving revision: `estospaces-web-dev-01254-les`
- Source: `946f929e891e9536a695046d377e6284f29e78a9`
- Viewport: 283 × 642
- Result: a manager clicked a real Top Performing property and a real Property Updated activity. Both reached a canonical manager property detail URL, rendered the detail-only `Back to Properties` control, and did not render `Property not found`. No browser console or page errors were observed.

The screenshot is cropped to the loaded property-detail control and contains no property, user, or session data.
