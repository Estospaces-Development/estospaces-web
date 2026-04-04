# Estospaces Design System

This system refines the current Estospaces visual language instead of replacing it. The foundation stays the same:

- warm orange as the primary brand accent
- calm neutral surfaces
- soft premium depth
- strong information hierarchy
- dashboard-first product thinking

The goal is consistency across public pages, auth, user dashboards, manager tools, and fast-track workspaces.

## 1. Core Principles

### Clarity first

- Each screen should answer one question immediately.
- Titles, summaries, metrics, and actions must appear in that order.
- One primary action per section. Secondary actions should never visually compete with it.

### Premium restraint

- Use depth, blur, and gradients with intent.
- Surfaces should feel elevated, not glossy or decorative.
- Motion should support state changes, not call attention to itself.

### Workflow continuity

- Public pages should guide toward trust and conversion.
- Auth should feel secure and calm.
- Product pages should always expose the current status, next action, and supporting detail.

### Scalable consistency

- The same spacing rhythm, control sizing, and card language must apply across roles.
- Orange is the system accent. Do not introduce indigo or blue as a competing primary brand color.
- Semantic colors remain available for status only:
  - green: success or completed
  - amber: warning or pending
  - red: destructive or blocked
  - blue: informational support, never the main CTA

## 2. Brand Foundation

### Accent usage

- `orange` is for primary CTA buttons, active states, focus moments, and selected tabs.
- `orange-soft` is for highlighted supporting surfaces and active chips.
- Use neutral backgrounds for most layout structure so orange keeps meaning.

### Surface model

- `surface-page`: overall app or page background
- `surface-base`: standard cards, panels, forms
- `surface-muted`: secondary sections, search inputs, empty state backgrounds
- `surface-raised`: blurred or elevated shells such as auth and header containers

### Typography

- Display and headings: `Plus Jakarta Sans`
- Body and controls: `Inter`
- Serif is reserved for editorial or luxury storytelling, not operational dashboards

## 3. Layout Rules

### Global page frame

- Use a centered page shell with consistent horizontal padding.
- Keep most product pages inside a readable max width.
- Large data pages can expand wider, but the header block should still align to the same left edge as the content grid.

### Header structure

Every major page should start with:

1. context or breadcrumb if needed
2. page title
3. one-sentence supporting summary
4. primary action area

Metrics should come after the header, not before it.

### Section order

For operational screens:

1. page header
2. current-state summary
3. priority work or queue
4. detail workspace
5. secondary tools and history

For public pages:

1. value proposition
2. proof or trust
3. product explanation
4. CTA
5. footer navigation

For auth pages:

1. trust marker
2. title
3. short explanation
4. form
5. policy and account links

## 4. Spacing and Rhythm

Use an 8px rhythm for nearly everything.

### Spacing scale

- `4`: icon-to-text micro spacing
- `8`: tight inline spacing
- `12`: compact group spacing
- `16`: standard control padding
- `24`: card interior spacing
- `32`: section spacing inside a page
- `48+`: major breaks between page regions

### Layout spacing rules

- Card padding should default to `24px`.
- Large hero or auth shells can use `32px`.
- Avoid mixing `p-4`, `p-5`, `p-6`, and `p-7` randomly in the same screen.
- Use wider vertical spacing between semantic sections than inside them.

### Alignment rules

- Text, metrics, and controls should align to a shared content edge.
- Avoid floating action buttons inside card bodies unless they are part of the card’s core interaction.
- Keep icon containers aligned to the first text baseline or the card header zone.

## 5. Component Hierarchy

### Primary components

- Header
- Sidebar or top navigation
- Page header
- KPI card
- Workspace card
- Form field
- Empty state
- Toast and inline feedback

### Priority hierarchy

- Primary button: orange gradient, strong elevation
- Secondary button: neutral filled surface
- Outline button: low-emphasis supporting action
- Ghost button: inline utility only

### Card hierarchy

- metric card: compact, one number and one meaning
- section card: contains grouped content
- workspace card: larger, operational, supports multiple actions
- supporting panel: quieter surface for notes, blockers, deadlines, or help

## 6. Navigation Structure

### Public navigation

- Keep top-level links short and stable.
- The right side should always end with `Sign In` and a single primary CTA.

### Product navigation

- Sidebars and horizontal tabs should show the active location clearly.
- Active states should use orange-backed emphasis, not only a text-color change.
- Badge counts should be supportive and small, not dominant.

### Fast-track navigation

- Treat fast-track as a workflow, not just a page.
- Always provide direct links to the downstream workspace:
  - documents
  - messages
  - viewings
  - applications or offers
  - contracts
  - payments

## 7. Content Placement Rules

### What goes high on the page

- current status
- next action
- deadline or urgency signal
- primary outcome metric

### What stays lower

- long explanations
- full history
- secondary metadata
- support or escalation copy

### Copy rules

- Use short operational summaries.
- Prefer direct language over marketing language inside dashboards.
- Empty states should explain what is missing and what action unlocks the next step.

## 8. Interaction Patterns

### Buttons

- One dominant CTA per zone.
- Hover should feel lighter and tighter, not dramatic.
- Focus state must use the orange system ring.

### Forms

- Labels stay above fields.
- Icons inside fields are optional and only helpful when they reinforce meaning.
- Error state should change border, ring, and supporting copy together.

### State feedback

- Inline errors for form issues
- Toasts for workflow completion or background sync events
- Empty states for missing content
- Status chips for live workflow stage

### Motion

- Use small lift, fade, and opacity transitions.
- Avoid bounce, shimmer, or bright hover effects on operational dashboards unless they signal loading or urgency.

## 9. Responsive Behavior

### Mobile

- Keep one primary column.
- Move secondary actions below the main CTA.
- Let metrics stack vertically.
- Horizontal nav can scroll, but the active item must stay obvious.

### Tablet

- Two-column sections are acceptable when comparison matters.
- Avoid three-column density unless the content is very short.

### Desktop

- Use wider panels for workflows and detail views.
- Place secondary context in an aside only when the main task remains readable.

## 10. Accessibility Rules

- Body copy must remain readable on neutral surfaces.
- Never rely on color alone for state changes.
- Every interactive control needs a visible focus treatment.
- Destructive actions must be clearly labeled and visually distinct.
- Do not expose internal test credentials or seed hints in production-facing screens.

## 11. Fast-Track Screen Template

Use this order for fast-track pages:

1. page title and short status summary
2. live metrics
3. queue or selected case overview
4. linked journey summary
5. action panel
6. embedded workspace

### Fast-track emphasis rules

- next action belongs near the top
- blockers and deadlines belong in supporting cards
- verification state must be explicit
- linked journey should explain why the case is where it is now

## 12. Implementation Notes

The current system is represented in these files:

- `src/globals.css`
- `src/components/ui/Button.tsx`
- `src/components/ui/Card.tsx`
- `src/components/ui/Input.tsx`
- `src/components/ui/EmptyState.tsx`
- `src/components/ui/KPICard.tsx`
- `src/components/ui/SummaryCard.tsx`
- `src/components/layout/PublicHeader.tsx`
- `src/layouts/AuthLayout.tsx`
- `src/pages/auth/login/page.tsx`

## 13. Rules for Future Screens

- Start with the existing orange-neutral palette.
- Reuse the shared button, card, and input system before creating new variants.
- Keep the first screenful focused on status, action, and trust.
- If a new component needs a new style rule, add it to the system once, then reuse it everywhere.

If a new screen looks attractive but breaks rhythm, overuses color, or competes with the user’s next action, it is not aligned with the Estospaces design system.
