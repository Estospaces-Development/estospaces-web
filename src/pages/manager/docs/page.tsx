import SimpleDocsPage from '@/components/docs/SimpleDocsPage';

const managerGuideMarkdown = `
# Manager Dashboard Guide

Use this guide to understand the current manager-facing routes in production.

## Dashboard

The dashboard is the main manager command surface for inventory, activity, live response, and current workload.

## Leads and Clients

Leads is the live route for intake, follow-up, and relationship context tied to active property work.

## Applications and Appointments

Applications and appointments remain the manager action surfaces for decisions, scheduling, and linked case follow-through.

## Contracts

Contracts is where agreement state, payment readiness, and handover blockers are reviewed.

## Fast-track

Fast-track is the manager workspace for active accelerated cases and next-step execution.

## Case Files

Case files are support context. Use them for reference and jump back to fast-track for the live workflow action.

## Help and Support

Manager support is the route to escalate platform, workflow, document, or case-state issues that need intervention.
`;

export default function ManagerDocsPage() {
    return (
        <SimpleDocsPage
            label="Manager Docs"
            title="Guide to the current manager dashboard and live workflow routes."
            subtitle="Use this guide to review manager dashboard operations, live response handling, applications, appointments, contracts, and the routes that currently own execution."
            markdown={managerGuideMarkdown}
            supportHref="/manager/help"
            supportLabel="Open Manager Support"
        />
    );
}
