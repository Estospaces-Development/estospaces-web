export interface JourneyBlocker {
    code: string;
    severity?: string;
    scope?: string;
    title: string;
    description?: string;
}

export interface JourneyDeadline {
    code: string;
    label: string;
    due_at?: string | null;
    status?: string;
    description?: string;
}

export interface JourneyRequirement {
    code: string;
    label: string;
    status?: string;
    scope?: string;
    description?: string;
}

export interface JourneyAction {
    code: string;
    label: string;
    target?: string;
    method?: string;
    description?: string;
}

export interface JourneyState {
    jurisdiction_profile?: string;
    live_stage?: string;
    stage_group?: string;
    journey_status_reason?: string;
    blockers?: JourneyBlocker[];
    deadlines?: JourneyDeadline[];
    required_evidence?: JourneyRequirement[];
    next_actions?: JourneyAction[];
}

export interface JourneyStateFields {
    journey_state?: JourneyState | null;
    jurisdiction_profile?: string;
    live_stage?: string;
    stage_group?: string;
    journey_status_reason?: string;
    blockers?: JourneyBlocker[];
    deadlines?: JourneyDeadline[];
    required_evidence?: JourneyRequirement[];
    next_actions?: JourneyAction[];
}
