import SimpleDocsPage from '@/components/docs/SimpleDocsPage';

const userGuideMarkdown = `
# User Dashboard Guide

Use this guide to understand the current user-facing routes in production.

## Dashboard

The dashboard is the main command surface for active journeys, saved properties, broker requests, and linked workflow entry points.

## Applications

Applications shows the current application state, linked approvals, and the next user-visible action for each property.

## Contracts

Contracts is the route for agreement review, payment readiness, and signed document follow-through.

## Messages

Messages keeps the live thread with managers and support. Use it whenever the workflow needs written coordination.

## Help and Support

Help and Support is the escalation route when the app state, document lane, or live journey needs human intervention.

## Fast-track

Fast-track is the stable user-facing entry back into the active case journey when the selected property is already moving through a live workflow.
`;

export default function UserDocsPage() {
    return (
        <SimpleDocsPage
            label="User Docs"
            title="Guide to the current user dashboard and linked journey surfaces."
            subtitle="Use this guide to understand the current user dashboard, support workflow, applications, contracts, and the live routes that now own the next action."
            markdown={userGuideMarkdown}
            supportHref="/user/dashboard/help"
            supportLabel="Open Help & Support"
        />
    );
}
