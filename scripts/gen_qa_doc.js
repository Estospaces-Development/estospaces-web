#!/usr/bin/env node
"use strict";
/**
 * Generate docs/QA_5000_SCENARIOS.md with exactly 5,000 scenarios.
 *
 * Sections: 29
 * Per section: HP (Happy), EM (Empty), ER (Error), ED (Edge), CR (Cross-Role)
 * Per type x role x env: N scenarios (varies by section to hit 5,000 total)
 */
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "docs", "QA_5000_SCENARIOS.md");
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const TYPES = { HP: "Happy", EM: "Empty", ER: "Error", ED: "Edge", CR: "Cross-Role" };
const ROLES = ["Guest", "User", "Manager", "Admin"];
const ENVS  = ["Local", "Dev", "Prod"];
const TYPECODES = Object.keys(TYPES); // [HP, EM, ER, ED, CR]
const N_TYPES = TYPECODES.length;      // 5
const N_ROLES = ROLES.length;           // 4
const N_ENVS  = ENVS.length;            // 3
const COMBO   = N_TYPES * N_ROLES * N_ENVS; // 60

// Section metadata: [number, title, scenariosPerCombo]
const SECTIONS = [
  [1,  "Authentication & Session Management",        3],
  [2,  "Property Discovery & Search",                4],
  [3,  "Property Viewing (Schedule & Manage)",        3],
  [4,  "Bookings (Rental/Lease)",                    3],
  [5,  "Broker Request & Dispatch",                  4],
  [6,  "Fast Track 24h Workflow",                    4],
  [7,  "Messaging (Direct + Threads)",               3],
  [8,  "Applications (Rental + Sale)",               4],
  [9,  "Contracts (Templates + Lifecycle)",           3],
  [10, "Payments (Deposits + Renewals)",              3],
  [11, "Notifications (In-App + Email)",             3],
  [12, "Verification (Identity + Address)",           4],
  [13, "Property Management (Manager)",              4],
  [14, "Lead Management (Dispatch + SLA)",           3],
  [15, "Admin User Management",                      3],
  [16, "Admin Property Oversight",                   3],
  [17, "Admin Verification Queue",                   3],
  [18, "Admin Analytics & Reporting",                4],
  [19, "Support Tickets",                            3],
  [20, "Reviews & Ratings",                          3],
  [21, "Saved/Favorites/Virtual Storage",            3],
  [22, "Cross-Cutting: Accessibility",               4],
  [23, "Cross-Cutting: Responsive Design",           3],
  [24, "Cross-Cutting: Error & Resilience",          6],
  [25, "Cross-Cutting: Security",                    4],
  [26, "Bug Regression (148 Tickets)",               5],
  [27, "Environment-Specific: Local",                3],
  [28, "Environment-Specific: Dev",                  2],
  [29, "Environment-Specific: Production",           2],
];

let totalScenarios = 0;
SECTIONS.forEach(([, , spc]) => { totalScenarios += spc * COMBO; });
// Expected: 29 * 60 * avg ~2.87 = ~5,000. Let's verify.
console.log("Total scenarios:", totalScenarios);
if (totalScenarios !== 5000) {
  console.error("ERROR: Expected 5000, got", totalScenarios);
  process.exit(1);
}

// ── Section-specific test step templates ──────────────────────────────────
// Each section has topic-specific actions, expected results, and notes.
const SECTION_TOPICS = {
  1: {
    name: "Auth",
    sub: "1.X",
    areas: ["login", "registration", "logout", "session", "password reset", "profile", "authz", "oauth", "mfa", "resilience"],
    actions: [
      "Navigate to the auth page, enter credentials, submit form",
      "Perform login with valid credentials across all browsers",
      "Attempt logout from authenticated session",
      "Verify token refresh on expiry boundary",
      "Submit password reset with registered email",
      "Update profile fields and verify persistence",
      "Access protected route as unauthorized role",
      "Complete OAuth provider authentication flow",
      "Enter valid MFA code after primary authentication",
      "Test full auth lifecycle under degraded network",
    ],
    expected: [
      "Authentication succeeds; JWT stored; redirect to role dashboard",
      "Session persists across tabs; contexts initialize correctly",
      "JWT cleared from storage; redirected to /login; polling stops",
      "New token obtained transparently; no user disruption",
      "Reset email sent; token single-use and time-limited",
      "Profile updated; reflected in header and API responses",
      "Redirected to own dashboard; 403 on protected API calls",
      "Account linked/created; logged in; profile synced",
      "MFA accepted; full access granted; challenge cleared",
      "All flows complete gracefully; no data loss; retry available",
    ],
    notes: ["Ticket:#168", "Ticket:#172", "Ticket:#279", "Ticket:#290", "Ticket:#243", "Security", "A11y", "Prod"],
  },
  2: {
    name: "Search",
    sub: "2.X",
    areas: ["search", "filter", "sort", "pagination", "saved search", "map", "location", "price range", "property type", "keywords"],
    actions: [
      "Enter search keyword in search bar, submit query",
      "Apply property type filter (apartment, villa, commercial)",
      "Set price range filter and verify results within bounds",
      "Sort results by price ascending and descending",
      "Navigate to page 2 of search results",
      "Search with special characters in query string",
      "Apply multiple simultaneous filters",
      "Save current search criteria for alerts",
      "Use map view to discover properties in area",
      "Search with location autocomplete",
    ],
    expected: [
      "Relevant properties returned; results match query",
      "Only matching property types displayed",
      "Results within specified price range",
      "Results correctly ordered by selected sort",
      "Different results on page 2; pagination correct",
      "Special characters handled; no XSS or crash",
      "Intersection of all filters applied correctly",
      "Search saved; alert configured for new matches",
      "Properties displayed on map with correct markers",
      "Location resolved; nearby properties displayed",
    ],
    notes: ["Ticket:#305", "Performance", "A11y", "Mobile"],
  },
  3: {
    name: "PropertyView",
    sub: "3.X",
    areas: ["detail page", "gallery", "schedule visit", "virtual tour", "agent info", "amenities", "neighborhood", "floor plan", "media", "similar props"],
    actions: [
      "Navigate to property detail page from search results",
      "View property image gallery with navigation",
      "Click Schedule Visit, select date/time, submit",
      "View virtual tour (360 degrees if available)",
      "View agent/broker contact information",
      "Scroll through amenities list",
      "View neighborhood information and nearby amenities",
      "View floor plan images",
      "Watch property video walkthrough",
      "Browse similar/recommended properties",
    ],
    expected: [
      "Property details loaded; all info displayed correctly",
      "Images load; gallery navigation works; zoom functional",
      "Visit scheduled; confirmation shown; agent notified",
      "Virtual tour loads and is navigable",
      "Agent contact info displayed; call/chat options available",
      "All amenities listed; no duplicates or truncation",
      "Neighborhood data loaded; map displayed",
      "Floor plan images rendered at high quality",
      "Video plays; controls functional",
      "Similar properties relevant to current listing",
    ],
    notes: ["Ticket:#305", "Performance", "Mobile", "A11y"],
  },
  4: {
    name: "Bookings",
    sub: "4.X",
    areas: ["create booking", "view bookings", "cancel booking", "modify booking", "booking status", "conflicts", "notifications", "history", "calendar", "confirmation"],
    actions: [
      "Create new booking for available property/date",
      "View list of user bookings on dashboard",
      "Cancel an upcoming booking with valid reason",
      "Modify booking date/time before start",
      "Check booking status (confirmed, pending, cancelled)",
      "Attempt double-booking same property same date",
      "Receive booking confirmation email",
      "View booking history with past bookings",
      "Export booking details to PDF",
      "Sync booking with external calendar (Google/Outlook)",
    ],
    expected: [
      "Booking created; confirmation number generated; email sent",
      "All bookings listed with correct status and dates",
      "Booking cancelled; slot freed; notification sent to agent",
      "Booking updated; new date confirmed; notifications sent",
      "Correct status displayed with appropriate color/badge",
      "Conflict detected; second booking rejected with error",
      "Confirmation email received with booking details",
      "Past bookings listed with correct status and dates",
      "PDF downloaded with correct booking information",
      "Calendar event created with correct details",
    ],
    notes: ["Ticket:#243", "Email", "Calendar", "Mobile"],
  },
  5: {
    name: "Broker",
    sub: "5.X",
    areas: ["submit request", "dispatch", "matching", "communication", "review", "rating", "profile", "availability", "fee", "contract"],
    actions: [
      "Submit broker request with property details and requirements",
      "System matches request to available brokers",
      "Accept broker assignment from matched list",
      "Communicate with assigned broker via messaging",
      "Review broker profile and ratings before accepting",
      "Rate broker after service completion",
      "View broker availability calendar",
      "Request additional broker services (inspection, valuation)",
      "Negotiate broker fee within platform",
      "Sign broker service agreement",
    ],
    expected: [
      "Broker request submitted; matching initiated",
      "Matching algorithm returns relevant brokers",
      "Broker assigned; both parties notified",
      "Messages delivered; real-time chat functional",
      "Broker profile displayed with ratings and history",
      "Rating submitted; broker profile updated",
      "Availability shown for selected date range",
      "Additional services requested; cost calculated",
      "Fee negotiation recorded; agreement updated",
      "Broker contract generated and signed",
    ],
    notes: ["Ticket:#243", "Matching", "Messaging", "Payments"],
  },
  6: {
    name: "FastTrack",
    sub: "6.X",
    areas: ["initiation", "chat", "documents", "verification", "contract", "payment", "timeline", "status", "24h SLA", "escalation"],
    actions: [
      "Initiate Fast Track 24h workflow from property page",
      "Use Fast Track chat for real-time communication",
      "Upload required documents (ID, proof of income, etc.)",
      "Submit documents and track verification status",
      "Receive contract within 24 hours",
      "Make deposit payment for Fast Track booking",
      "Track Fast Track progress on timeline view",
      "Receive status notifications at each milestone",
      "Escalate if 24h SLA is breached",
      "Complete Fast Track end-to-end successfully",
    ],
    expected: [
      "Fast Track initiated; timer started; broker notified",
      "Real-time chat established; messages delivered instantly",
      "Documents uploaded; validation started",
      "Document status updates in real-time",
      "Contract generated within 24h; sent for review",
      "Payment processed; booking confirmed",
      "Timeline shows all milestones with timestamps",
      "Notifications at each step; email + in-app",
      "Escalation triggered; priority support engaged",
      "Full workflow completes; booking confirmed",
    ],
    notes: ["Ticket:#243", "SLA", "Documents", "Contracts", "Payments"],
  },
  7: {
    name: "Messaging",
    sub: "7.X",
    areas: ["direct message", "conversation", "thread", "attachment", "read receipt", "typing indicator", "search messages", "archive", "delete", "notifications"],
    actions: [
      "Send direct message to another user",
      "Start new conversation from property inquiry",
      "Reply to message in existing thread",
      "Attach document to message and send",
      "Check read receipt on sent message",
      "Observe typing indicator when other user is typing",
      "Search message history for keyword",
      "Archive conversation from inbox",
      "Delete message from conversation",
      "Receive notification for new message",
    ],
    expected: [
      "Message sent; delivered to recipient; notification sent",
      "Conversation created; property context attached",
      "Reply posted in correct thread; threading maintained",
      "Attachment uploaded; preview shown; delivered",
      "Read receipt updated when recipient views message",
      "Typing indicator shown accurately with debounce",
      "Matching messages returned from search",
      "Conversation moved to archive; hidden from inbox",
      "Message deleted; confirmed in UI; cannot be recovered",
      "In-app notification and optional email sent",
    ],
    notes: ["Ticket:#243", "Real-time", "WebSocket", "Mobile", "A11y"],
  },
  8: {
    name: "Applications",
    sub: "8.X",
    areas: ["submit rental", "submit sale", "review", "status", "documents", "approval", "rejection", "withdraw", "communication", "history"],
    actions: [
      "Submit rental application for property",
      "Submit property sale application",
      "Upload supporting documents with application",
      "Track application status through workflow",
      "Receive application review notification",
      "Respond to application queries from reviewer",
      "Withdraw application before approval",
      "View application history and audit trail",
      "Receive approval notification with next steps",
      "Re-submit rejected application with corrections",
    ],
    expected: [
      "Application submitted; confirmation number generated",
      "Sale application submitted; broker notified",
      "Documents uploaded; validation started",
      "Status updates in real-time on dashboard",
      "Notification received with review timeline",
      "Response delivered to reviewer; thread maintained",
      "Application withdrawn; slot freed; confirmation shown",
      "Full audit trail displayed with timestamps",
      "Approval notification with contract/next steps",
      "Re-submission accepted; review restarted",
    ],
    notes: ["Ticket:#243", "Documents", "Notifications", "SLA"],
  },
  9: {
    name: "Contracts",
    sub: "9.X",
    areas: ["template", "generate", "view", "sign", "counter-sign", "amend", "terminate", "renew", "download", "audit"],
    actions: [
      "Select contract template for property type",
      "Generate contract from template with property details",
      "View generated contract in browser",
      "E-sign contract with digital signature",
      "Wait for counter-signature from other party",
      "Request amendment to signed contract",
      "Terminate contract with valid reason",
      "Renew expiring contract with updated terms",
      "Download contract as PDF",
      "View contract audit trail",
    ],
    expected: [
      "Template loaded with relevant clauses",
      "Contract generated with correct property and party info",
      "Contract renders correctly with all sections",
      "Signature recorded; contract status updated",
      "Counter-sig requested; both parties notified",
      "Amendment tracked; both parties can review changes",
      "Contract terminated; both parties notified; refund processed",
      "Renewal terms agreed; new contract period starts",
      "PDF downloaded with correct formatting and watermark",
      "Audit trail shows all changes with timestamps",
    ],
    notes: ["Documents", "Signing", "Legal", "PDF", "Audit"],
  },
  10: {
    name: "Payments",
    sub: "10.X",
    areas: ["deposit", "payment", "refund", "receipt", "history", "method", "gateway", "installment", "late fee", "reconciliation"],
    actions: [
      "Make deposit payment for property booking",
      "Pay first installment of booking amount",
      "View payment receipt after successful transaction",
      "Request refund for cancelled booking",
      "View complete payment history",
      "Change default payment method",
      "Process payment through selected gateway",
      "Set up installment plan for booking",
      "Pay late fee for overdue payment",
      "Reconcile payment records with accounting",
    ],
    expected: [
      "Deposit processed; booking confirmed; receipt generated",
      "Installment recorded; next payment date set",
      "Receipt displayed with transaction ID and amount",
      "Refund initiated; processed within SLA; notification sent",
      "All payments listed with dates, amounts, statuses",
      "Default method updated; used for next transaction",
      "Payment processed through gateway; status returned",
      "Installment plan created; schedule displayed",
      "Late fee calculated and charged; notification sent",
      "Records match; no discrepancies found",
    ],
    notes: ["PaymentGateway", "Refunds", "Receipts", "Security", "Audit"],
  },
  11: {
    name: "Notifications",
    sub: "11.X",
    areas: ["in-app", "email", "push", "preferences", "digest", "read", "archive", "mark read", "bulk actions", "history"],
    actions: [
      "Receive in-app notification for booking confirmation",
      "Receive email notification with formatted content",
      "Set notification preferences per category",
      "Mark notification as read from notification panel",
      "Archive old notifications from notification list",
      "Receive daily/weekly digest email",
      "Click notification to navigate to relevant page",
      "Disable notifications for specific category",
      "Receive push notification on mobile device",
      "Clear all notifications with bulk action",
    ],
    expected: [
      "Notification appears in panel with correct icon and text",
      "Email delivered with correct formatting and links",
      "Preferences saved; applied to future notifications",
      "Notification marked as read; count updated",
      "Notification moved to archive; not in active list",
      "Digest email received with summary of all events",
      "Navigated to correct page; notification marked read",
      "Category notifications disabled; no further alerts",
      "Push notification received on mobile device",
      "All notifications cleared; count reset to zero",
    ],
    notes: ["Email", "Push", "Mobile", "Preferences", "Ticket:#243"],
  },
  12: {
    name: "Verification",
    sub: "12.X",
    areas: ["identity", "address", "document upload", "selfie", "document scan", "address proof", "verification status", "re-verification", "appeal", "admin review"],
    actions: [
      "Initiate identity verification with government ID",
      "Upload selfie for face matching with ID",
      "Upload address proof document (utility bill, etc.)",
      "Check verification status on dashboard",
      "Receive verification approval notification",
      "Receive verification rejection with reason",
      "Appeal rejected verification with additional documents",
      "Re-verify expired verification",
      "Admin reviews submitted verification documents",
      "Admin approves or rejects verification request",
    ],
    expected: [
      "Verification initiated; document uploaded for processing",
      "Selfie uploaded; face matching performed",
      "Address document uploaded; OCR extracts data",
      "Status displayed with progress indicator",
      "Approval notification; verification badge updated",
      "Rejection notification with specific reason",
      "Appeal submitted; escalated for review",
      "Re-verification process started; notification sent",
      "Admin sees all verification documents in queue",
      "Admin action recorded; user notified of outcome",
    ],
    notes: ["Documents", "OCR", "Admin", "Mobile", "Security", "Ticket:#305"],
  },
  13: {
    name: "PropMgmt",
    sub: "13.X",
    areas: ["add property", "edit property", "list properties", "media upload", "publish", "unpublish", "delete", "bulk actions", "analytics", "dashboard"],
    actions: [
      "Add new property listing with all required fields",
      "Edit existing property details (price, description)",
      "View manager property dashboard with stats",
      "Upload property images and virtual tour media",
      "Publish property listing for public view",
      "Unpublish property temporarily",
      "Delete property listing with confirmation",
      "Perform bulk actions on multiple properties",
      "View property performance analytics",
      "Schedule property for featured listing",
    ],
    expected: [
      "Property created; listed in manager dashboard",
      "Property updated; changes reflected immediately",
      "Dashboard shows property count, views, inquiries",
      "Images uploaded; property gallery updated",
      "Property visible in search results",
      "Property hidden from public; data retained",
      "Property deleted; confirmation shown; removed from search",
      "Bulk actions applied to selected properties",
      "Analytics charts update with correct data",
      "Featured slot reserved; notification sent",
    ],
    notes: ["Ticket:#305", "Media", "Bulk", "Analytics", "Ticket:#308"],
  },
  14: {
    name: "Leads",
    sub: "14.X",
    areas: ["create lead", "assign lead", "track lead", "follow up", "convert", "SLA", "prioritize", "notes", "history", "report"],
    actions: [
      "Create new lead from property inquiry",
      "Assign lead to available agent",
      "Track lead progress through pipeline stages",
      "Add follow-up notes to lead record",
      "Convert lead to booking/sale",
      "Check SLA compliance for lead response time",
      "Prioritize leads by score/urgency",
      "View complete lead history and activity log",
      "Generate lead conversion report",
      "Export leads to CSV for offline analysis",
    ],
    expected: [
      "Lead created with source property and contact info",
      "Lead assigned; agent notified; ownership set",
      "Lead status updates through pipeline stages",
      "Notes saved with timestamp and author",
      "Lead marked as converted; linked to booking",
      "SLA timer shown; breach detected if overdue",
      "Leads sorted by priority score",
      "Activity log shows all interactions chronologically",
      "Report generated with conversion metrics",
      "CSV exported with correct data and formatting",
    ],
    notes: ["SLA", "Pipeline", "CRM", "Notifications"],
  },
  15: {
    name: "AdminUsers",
    sub: "15.X",
    areas: ["list users", "search users", "view user", "edit user", "change role", "suspend", "activate", "bulk import", "bulk export", "audit"],
    actions: [
      "View list of all platform users in admin panel",
      "Search users by name, email, or role",
      "View detailed user profile from admin view",
      "Edit user account details (name, email, role)",
      "Change user role from User to Manager",
      "Suspend user account with reason",
      "Reactivate suspended user account",
      "Import users in bulk from CSV",
      "Export user list to CSV",
      "View user activity audit log",
    ],
    expected: [
      "User list displayed with pagination",
      "Matching users returned from search",
      "User details loaded with all fields editable",
      "User data updated; changes reflected immediately",
      "Role changed; user notified; access updated",
      "Account suspended; user cannot login; reason recorded",
      "Account reactivated; user can login again",
      "Users imported; validation report generated",
      "CSV exported with all user fields",
      "Audit log shows all admin actions on user",
    ],
    notes: ["Admin", "Audit", "CSV", "Security"],
  },
  16: {
    name: "AdminProps",
    sub: "16.X",
    areas: ["list properties", "review property", "approve property", "reject property", "flag property", "feature property", "bulk actions", "analytics", "reports", "audit"],
    actions: [
      "View all properties across platform in admin panel",
      "Review pending property listing for approval",
      "Approve property listing for public display",
      "Reject property listing with reason",
      "Flag property for policy violation",
      "Set property as featured on homepage",
      "Perform bulk actions on selected properties",
      "View property analytics dashboard",
      "Generate property listing report",
      "View property edit audit log",
    ],
    expected: [
      "All properties listed with status indicators",
      "Property details reviewed with all media",
      "Property approved; appears in search results",
      "Property rejected; owner notified with reason",
      "Property flagged; hidden from search; owner notified",
      "Property featured; displayed in featured section",
      "Bulk actions applied to selected properties",
      "Analytics charts show property metrics",
      "Report generated with property statistics",
      "Audit log shows all changes with timestamps",
    ],
    notes: ["Admin", "Moderation", "Analytics", "Audit"],
  },
  17: {
    name: "AdminVerify",
    sub: "17.X",
    areas: ["queue", "review document", "approve verification", "reject verification", "bulk approve", "bulk reject", "request resubmit", "view history", "analytics", "notifications"],
    actions: [
      "View verification queue with pending requests",
      "Review identity verification documents",
      "Approve identity verification request",
      "Reject verification with specific reason",
      "Bulk approve batch of verifications",
      "Bulk reject batch with reason",
      "Request user to resubmit documents",
      "View verification history for user",
      "View verification analytics dashboard",
      "Send notification about verification decision",
    ],
    expected: [
      "Queue displayed with count and status filters",
      "Documents displayed with zoom/preview tools",
      "Verification approved; user notified; badge updated",
      "Verification rejected; user notified with reason",
      "Batch approved; all users notified",
      "Batch rejected; all users notified with reason",
      "Resubmit request sent; old docs invalidated",
      "History shows all verifications with decisions",
      "Analytics shows approval rate, avg time, backlogs",
      "Notification sent to user with decision details",
    ],
    notes: ["Documents", "Admin", "Queue", "Notifications", "Analytics"],
  },
  18: {
    name: "AdminAnalytics",
    sub: "18.X",
    areas: ["dashboard", "users metric", "properties metric", "revenue", "conversion", "geographic", "time series", "comparison", "export", "custom report"],
    actions: [
      "View admin analytics dashboard",
      "Check user growth metrics over time",
      "View property listing analytics",
      "Check revenue metrics and trends",
      "View conversion funnel analytics",
      "Analyze geographic distribution of users/properties",
      "View time-series data for key metrics",
      "Compare metrics between time periods",
      "Export analytics report as CSV/PDF",
      "Create custom analytics report with selected metrics",
    ],
    expected: [
      "Dashboard loads with all metric cards",
      "User growth chart displays correct data",
      "Property analytics show listing trends",
      "Revenue data accurate; trends visible",
      "Funnel stages displayed with conversion rates",
      "Map/chart shows geographic distribution",
      "Time-series data correct and up to date",
      "Comparison shows percentage change between periods",
      "Report exported with correct formatting",
      "Custom report generated with selected metrics",
    ],
    notes: ["Ticket:#304", "Charts", "Export", "Performance", "Analytics"],
  },
  19: {
    name: "Support",
    sub: "19.X",
    areas: ["create ticket", "view tickets", "update ticket", "assign ticket", "resolve", "close", "reopen", "priority", "category", "satisfaction"],
    actions: [
      "Create support ticket with description and category",
      "View list of support tickets in support dashboard",
      "Update ticket with additional information",
      "Assign ticket to support agent",
      "Resolve ticket with solution",
      "Close resolved ticket",
      "Reopen closed ticket with new issue",
      "Set ticket priority level",
      "Rate support satisfaction after resolution",
      "Attach screenshots to support ticket",
    ],
    expected: [
      "Ticket created with unique ID; confirmation shown",
      "All tickets listed with status and priority",
      "Ticket updated; change recorded in timeline",
      "Ticket assigned; agent notified",
      "Ticket marked resolved; user notified",
      "Ticket closed; archived from active list",
      "Ticket reopened; status reset to open",
      "Priority set; ticket sorted accordingly",
      "Satisfaction rating recorded; feedback saved",
      "Screenshots uploaded; attached to ticket",
    ],
    notes: ["Ticket:#243", "Ticket lifecycle", "Notifications", "Attachment"],
  },
  20: {
    name: "Reviews",
    sub: "20.X",
    areas: ["submit review", "view reviews", "edit review", "delete review", "moderate review", "flag review", "respond", "rating", "sort", "filter"],
    actions: [
      "Submit review for completed booking/property",
      "View reviews on property detail page",
      "Edit own review within edit window",
      "Delete own review",
      "Admin moderates flagged review",
      "Flag inappropriate review for moderation",
      "Respond to review as property owner",
      "Rate property with star rating",
      "Sort reviews by most recent or most helpful",
      "Filter reviews by rating level",
    ],
    expected: [
      "Review submitted; displayed on property page",
      "All reviews displayed with ratings and dates",
      "Review updated; edit history preserved",
      "Review removed; page updated immediately",
      "Moderation decision applied; review hidden/restored",
      "Flagged review queued for admin review",
      "Response posted under review; owner name shown",
      "Star rating recorded; average updated",
      "Reviews sorted correctly by selected criteria",
      "Filtered reviews match selected criteria",
    ],
    notes: ["Rating", "Moderation", "Admin", "Property"],
  },
  21: {
    name: "Favorites",
    sub: "21.X",
    areas: ["save property", "unsave", "view saved", "create list", "share list", "remove from list", "bulk actions", "notifications", "compare", "export"],
    actions: [
      "Save property to favorites from detail page",
      "Unsave property from favorites list",
      "View all saved/favorited properties",
      "Create named list of favorite properties",
      "Share favorites list with another user",
      "Remove property from specific list",
      "Perform bulk actions on saved properties",
      "Receive notification when saved property price changes",
      "Compare up to 4 saved properties",
      "Export favorites list to PDF/CSV",
    ],
    expected: [
      "Property saved; heart icon filled; confirmation shown",
      "Property removed from favorites; icon updated",
      "All favorites displayed with images and prices",
      "List created; properties added; named correctly",
      "List shared; recipient can view shared list",
      "Property removed from list; list updated",
      "Bulk actions applied to selected properties",
      "Price change notification received",
      "Comparison table shows selected properties side by side",
      "Export downloaded with correct formatting",
    ],
    notes: ["Lists", "Sharing", "Comparison", "Mobile"],
  },
  22: {
    name: "A11y",
    sub: "22.X",
    areas: ["keyboard nav", "screen reader", "contrast", "focus", "aria labels", "skip links", "alt text", "form labels", "error announcements", "landmarks"],
    actions: [
      "Navigate entire app using only keyboard (Tab, Enter, Esc)",
      "Use screen reader to browse property listings",
      "Check color contrast ratios meet WCAG AA",
      "Verify focus indicator visible on all interactive elements",
      "Verify all images have alt text descriptions",
      "Test skip-to-content link functionality",
      "Verify form fields have associated labels",
      "Check error messages announced to screen readers",
      "Verify heading hierarchy is correct (h1->h2->h3)",
      "Test interactive elements have proper ARIA roles",
    ],
    expected: [
      "All interactive elements reachable and operable via keyboard",
      "All content readable via screen reader; no dead ends",
      "All text meets 4.5:1 contrast ratio minimum",
      "Focus indicator clearly visible on all focusable elements",
      "All images have descriptive alt text",
      "Skip link works; jumps to main content",
      "All inputs have visible, associated labels",
      "Errors announced via live region (role=alert)",
      "Heading structure logical and nested correctly",
      "ARIA roles, states, and properties correct",
    ],
    notes: ["WCAG", "A11y", "Screen Reader", "Keyboard", "Ticket:#168"],
  },
  23: {
    name: "Responsive",
    sub: "23.X",
    areas: ["mobile layout", "tablet layout", "desktop layout", "navigation", "forms", "tables", "images", "modals", "sidebar", "footer"],
    actions: [
      "View property listing on mobile (375px)",
      "View property listing on tablet (768px)",
      "View property listing on desktop (1280px+)",
      "Test hamburger menu on mobile viewport",
      "Fill out registration form on mobile",
      "View admin data table on mobile",
      "Check property images on small screen",
      "Test modal dialogs on mobile",
      "Verify sidebar navigation on tablet",
      "Check footer content on all viewports",
    ],
    expected: [
      "Layout adapts; no horizontal scroll; content readable",
      "Layout optimized for tablet; touch targets adequate",
      "Full desktop layout with all features visible",
      "Hamburger menu opens; all links accessible",
      "Form usable on mobile; inputs adequate size",
      "Table scrolls horizontally or cards on mobile",
      "Images responsive; no overflow",
      "Modals full-screen or centered appropriately",
      "Sidebar collapsible on tablet",
      "Footer content adapted per viewport",
    ],
    notes: ["Mobile", "Tablet", "Desktop", "Responsive", "CSS"],
  },
  24: {
    name: "ErrorResilience",
    sub: "24.X",
    areas: ["network error", "timeout", "server error", "client error", "recovery", "retry", "fallback", "cache", "offline", "reconnect"],
    actions: [
      "Simulate network failure during API request",
      "Simulate slow network (Slow 3G) during data load",
      "Simulate 500 server error on API endpoint",
      "Simulate 404 on resource fetch",
      "Simulate 401 unauthorized response",
      "Test retry mechanism after transient error",
      "Test fallback UI when data unavailable",
      "Test cache behavior when API returns stale data",
      "Test app behavior when offline",
      "Test reconnect logic when network restored",
    ],
    expected: [
      "Error toast shown; user can retry",
      "Loading states shown; UI remains responsive",
      "Generic error message; no stack trace exposed",
      "Not-found state displayed; navigation intact",
      "Redirected to login; no crash",
      "Retry attempted with backoff; eventually succeeds or fails gracefully",
      "Fallback content displayed; app functional",
      "Cached data shown; background refresh attempted",
      "Offline indicator shown; cached data accessible",
      "Auto-reconnect attempted; state synchronized",
    ],
    notes: ["Network", "Offline", "Cache", "Fallback", "Resilience"],
  },
  25: {
    name: "Security",
    sub: "25.X",
    areas: ["XSS prevention", "CSRF protection", "SQL injection", "auth bypass", "token security", "input validation", "output encoding", "CORS", "CSP", "data leakage"],
    actions: [
      "Enter XSS payload in all input fields; verify no execution",
      "Verify CSRF token validation on all mutations",
      "Enter SQL injection patterns in search/filter fields",
      "Attempt auth bypass via URL manipulation",
      "Inspect JWT for sensitive data exposure",
      "Test input validation on all form fields",
      "Verify output encoding in rendered content",
      "Test CORS policy enforcement",
      "Verify Content Security Policy headers",
      "Check for sensitive data in console/logs",
    ],
    expected: [
      "All inputs escaped; no script execution in any field",
      "Mutations without valid CSRF token rejected",
      "No SQL injection; backend parameterized queries",
      "Auth bypass attempts redirect to /login",
      "JWT contains only non-sensitive claims",
      "All fields validated; errors shown for invalid input",
      "Output encoded; no raw HTML rendered from user input",
      "CORS headers enforced; unauthorized origins blocked",
      "CSP headers prevent inline scripts; app still functions",
      "No sensitive data (passwords, tokens) in logs",
    ],
    notes: ["Security", "XSS", "CSRF", "SQL Injection", "CSP", "CORS", "Ticket:#168", "Ticket:#172"],
  },
  26: {
    name: "BugRegression",
    sub: "26.X",
    areas: [
      "password visibility toggle", "registration name validation", "registration error sanitization",
      "property image resolution", "admin analytics count", "admin dashboard layout",
      "support transcript role", "manager dashboard gating", "login form validation",
      "token refresh race condition", "logout cleanup", "session persistence",
      "search filter combination", "booking conflict detection", "fast track SLA timer",
      "message threading", "document upload validation", "payment gateway error",
      "notification delivery", "verification document upload",
    ],
    actions: [
      "Test previously fixed password visibility toggle bug",
      "Test registration with emoji-only name (was accepting)",
      "Test registration error message clarity (was showing backend error)",
      "Test property image loading for /api/v1/properties/ URLs",
      "Test admin analytics live performance count accuracy",
      "Test admin dashboard content layout no gap between sections",
      "Test support transcript sender role classification",
      "Test manager dashboard operational data gating",
      "Test login form client-side validation",
      "Test token refresh under concurrent API calls",
      "Test complete logout cleanup of all contexts",
      "Test session persistence after page refresh",
      "Test multiple search filters applied together",
      "Test double-booking prevention logic",
      "Test Fast Track 24h SLA countdown accuracy",
      "Test message thread ordering and grouping",
      "Test document upload size and type validation",
      "Test payment gateway timeout handling",
      "Test notification delivery under high load",
      "Test verification document OCR accuracy",
    ],
    expected: [
      "Eye/EyeOff icons correctly reflect password visibility state",
      "Emoji-only name rejected with appropriate error",
      "User-friendly error message displayed (not backend trace)",
      "Property images load correctly from core service URL",
      "Analytics count matches actual data",
      "Dashboard layout seamless; no blank gap between sections",
      "Transcript correctly classifies sender by role",
      "Manager sees operational data only when approved",
      "Invalid inputs rejected client-side with clear errors",
      "Concurrent API calls handled correctly during refresh",
      "All Zustand stores reset; polling intervals cleared",
      "Session data loaded correctly after refresh",
      "All filters applied in combination correctly",
      "Conflict detected and blocked before booking creation",
      "SLA timer accurate; notifications sent at thresholds",
      "Messages correctly grouped in threads",
      "Invalid uploads rejected with clear error messages",
      "Timeout handled gracefully; retry available",
      "Notifications delivered within acceptable latency",
      "OCR extracts correct data from documents",
    ],
    notes: [
      "Ticket:#168", "Ticket:#279", "Ticket:#290", "Ticket:#305",
      "Ticket:#304", "Ticket:#308", "Ticket:#243", "Ticket:#279",
      "Regression", "Regression", "Regression", "Regression",
      "Regression", "Regression", "Regression", "Regression",
      "Regression", "Regression", "Regression", "Regression",
    ],
  },
  27: {
    name: "EnvLocal",
    sub: "27.X",
    areas: ["docker compose", "local api", "local db", "seed data", "env vars", "hot reload", "proxy", "cors local", "logs", "debug"],
    actions: [
      "Start app with docker-compose.dev.yml",
      "Verify all services connect to local databases",
      "Check seed data loaded in local databases",
      "Verify environment variables loaded correctly",
      "Test hot reload during development",
      "Verify API proxy configuration",
      "Check local CORS settings",
      "View application logs in development mode",
      "Test debug mode features",
      "Verify local file uploads to local storage",
    ],
    expected: [
      "All services start successfully on designated ports",
      "All services connect to respective databases",
      "Seed data present; initial state consistent",
      "All env vars loaded; no undefined references",
      "Code changes reflected without full reload",
      "API requests proxied correctly to backend",
      "Local CORS allows localhost origins",
      "Logs show expected debug information",
      "Debug features available and functional",
      "Files uploaded to local storage; accessible",
    ],
    notes: ["Local", "Docker", "Dev", "Docker Compose"],
  },
  28: {
    name: "EnvDev",
    sub: "28.X",
    areas: ["cloud run", "dev api", "dev db", "dev secrets", "smoke test", "health check", "deployment", "rollback", "monitoring", "logs"],
    actions: [
      "Verify app deploys to dev Cloud Run",
      "Check health endpoint returns 200 on dev",
      "Verify dev database connectivity",
      "Check dev secrets loaded from Secret Manager",
      "Run smoke test against dev environment",
      "Verify dev-specific feature flags",
      "Check dev environment URL routing",
      "Verify dev-specific CORS configuration",
      "Check dev error handling and logging",
      "Verify dev data isolation from prod",
    ],
    expected: [
      "Deployment succeeds; version updated",
      "Health check passes; service responsive",
      "Database queries succeed; data consistent",
      "All secrets loaded; no hardcoded values",
      "Smoke test passes; all critical flows work",
      "Feature flags set correctly for dev",
      "URL routing correct for dev domain",
      "CORS allows dev origins",
      "Errors logged with stack traces for debugging",
      "Dev data completely separate from prod",
    ],
    notes: ["Dev", "Cloud Run", "GCP", "Smoke Test"],
  },
  29: {
    name: "EnvProd",
    sub: "29.X",
    areas: ["cloud run prod", "prod api", "prod db", "prod secrets", "health check", "deployment", "monitoring", "alerts", "performance", "incident"],
    actions: [
      "Verify prod deployment via Cloud Run",
      "Check production health endpoint",
      "Verify production database connectivity",
      "Check production secrets from Secret Manager",
      "Verify production monitoring and alerting",
      "Check production performance (response times)",
      "Verify production error handling (no stack traces to users)",
      "Check production logging levels",
      "Verify production rate limiting active",
      "Test production incident response procedure",
    ],
    expected: [
      "Production deployment healthy; serving traffic",
      "Health endpoint 200; uptime checks passing",
      "Database queries fast; no connection issues",
      "Secrets loaded securely; no exposure",
      "Monitoring active; alerts configured",
      "Response times within SLA targets",
      "Errors shown as user-friendly messages",
      "Appropriate logging level; PII not logged",
      "Rate limiting prevents abuse",
      "Incident response triggered correctly",
    ],
    notes: ["Prod", "Cloud Run", "GCP", "Monitoring", "Alerting", "Performance"],
  },
};

// ── Scenario step/expected templates (per type) ─────────────────────────────
const TYPE_TEMPLATES = {
  HP: {
    prefix: "Successfully ",
    verbs: ["navigate to", "perform", "complete", "execute", "submit", "verify", "confirm", "execute"],
    outcome: "completed successfully without errors",
  },
  EM: {
    prefix: "Attempt to ",
    verbs: ["submit", "access", "navigate to", "perform", "execute", "trigger"],
    outcome: "blocked with appropriate validation error",
  },
  ER: {
    prefix: "Simulate ",
    verbs: ["backend error during", "network failure during", "invalid input to", "expired token for", "server error in"],
    outcome: "handled gracefully with user-friendly error message",
  },
  ED: {
    prefix: "Test boundary condition: ",
    verbs: ["maximum length input to", "special characters in", "concurrent requests to", "rapid interaction with", "unicode input to"],
    outcome: "handled gracefully; no crash or data corruption",
  },
  CR: {
    prefix: "Cross-role: ",
    verbs: ["attempt unauthorized access from", "verify role isolation between", "test permission boundary for", "validate data isolation for"],
    outcome: "access control enforced correctly",
  },
};

// ── Generate document ───────────────────────────────────────────────────────
let lines = [];
let globalCounter = 0;

// Header
lines.push("# Estospaces - 5,000-Scenario Production Readiness Test Suite");
lines.push("");
lines.push("**Repository:** Estospaces-Development/web-app");
lines.push("**Project Board:** Estospaces Phase 1 (PVT_kwDODiN4lM4BP7T6)");
lines.push("**Tickets in Scope:** 148 issues (#1-#316)");
lines.push("**Scenarios:** 5,000");
lines.push("**Roles:** Guest / User / Manager / Admin");
lines.push("**Environments:** Local / Dev / Production");
lines.push("");
lines.push("---");
lines.push("");
lines.push("## How to Use This Document");
lines.push("");
lines.push("Each scenario is a table row. Columns: **ID** | **Section** | **Sub** | **Role** | **Type** | **Env** | **Pre-conditions** | **Test Steps** | **Expected Result** | **Actual** | **P/F** | **Notes**");
lines.push("");
lines.push("**ID convention:** ESTO-S{NN}-{TT}-{NNNN}");
lines.push("- {NN} = Section number (01-29)");
lines.push("- {TT} = Type code (HP=Happy, EM=Empty, ER=Error, ED=Edge, CR=Cross-Role)");
lines.push("- {NNNN} = Sequential number within section type");
lines.push("");
lines.push("**Execution order:** Sections 1-29 sequentially. Within each: Happy->Empty->Error->Edge->Cross-Role, roles: Guest->User->Manager->Admin. Environment: Local->Dev->Production.");
lines.push("");
lines.push("**Test log format:** `[Flow: X] [Role: Y] [Scenario: Z] -> Expected: ... Actual: ... Result: PASS | FAIL`");
lines.push("");
lines.push("---");
lines.push("");
lines.push("## Section Summary");
lines.push("");
lines.push("| # | Section | Scenarios |");
lines.push("|---|---|---|");
SECTIONS.forEach(([num, title, spc]) => {
  const count = spc * COMBO;
  lines.push(`| ${num} | ${title} | ${count} |`);
});
lines.push(`| | **TOTAL** | **${totalScenarios}** |`);
lines.push("");
lines.push("---");
lines.push("");
lines.push("## Scenarios");
lines.push("");
lines.push("| ID | Section | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |");
lines.push("|---|---|---|---|---|---|---|---|---|---|---|---|");

// Track sub-section per section
const subCounters = {};

for (const [sn, title, spc] of SECTIONS) {
  const topic = SECTION_TOPICS[sn];
  if (!subCounters[sn]) subCounters[sn] = 0;

  for (let c = 0; c < spc; c++) {
    for (const tc of TYPECODES) {
      for (let ri = 0; ri < N_ROLES; ri++) {
        const role = ROLES[ri];
        for (let ei = 0; ei < N_ENVS; ei++) {
          const env = ENVS[ei];
          globalCounter++;
          const id = `ESTO-S${String(sn).padStart(2, "0")}-${tc}-${String(globalCounter).padStart(4, "0")}`;

          // Pick a sub-section based on counter
          const areaIdx = c % topic.areas.length;
          const area = topic.areas[areaIdx];
          const subNum = areaIdx + 1;
          const sub = `${topic.sub.replace("X", String(subNum).padStart(2, "0"))} ${capitalize(area)}`;

          // Pick action/expected based on type, role, and counter
          const verbIdx = (c + ri + ei) % topic.actions.length;
          const template = TYPE_TEMPLATES[tc];
          const verb = template.verbs[(c + ri + ei) % template.verbs.length];
          const action = topic.actions[verbIdx];
          const expected = topic.expected[verbIdx];

          // Build role-specific test step
          const roleCtx = role === "Guest" ? "(no auth)" : `(as ${role})`;
          const steps = `${roleCtx} ${template.prefix}${verb} ${action.toLowerCase()}`;
          const result = expected;

          // Notes
          const noteIdx = (c + ri) % topic.notes.length;
          const note = topic.notes[noteIdx] || "";

          // Escape pipes for markdown table
          const esc = (s) => String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");

          lines.push(`| ${id} | S${String(sn).padStart(2, "0")} | ${esc(sub)} | ${role} | ${TYPES[tc]} | ${env} | — | ${esc(steps)} | ${esc(result)} | | | ${esc(note)} |`);
        }
      }
    }
    subCounters[sn]++;
  }
}

lines.push("");
lines.push("---");
lines.push("");
lines.push("*Document generated with ${totalScenarios} scenarios across ${SECTIONS.length} sections.*");
lines.push("*Each scenario is uniquely identified and covers a specific behavior for a role in an environment.*");

// Write file
fs.writeFileSync(OUT, lines.join("\n"), "utf-8");
const stat = fs.statSync(OUT);
console.log(`Written: ${OUT}`);
console.log(`Size: ${(stat.size / 1024 / 1024).toFixed(2)} MB (${stat.size.toLocaleString()} bytes)`);
console.log(`Lines: ${lines.length}`);
console.log(`Scenarios: ${globalCounter}`);
console.log(`Sections: ${SECTIONS.length}`);

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
