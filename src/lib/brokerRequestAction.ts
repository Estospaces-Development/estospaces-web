export interface BrokerRequestActionState {
    sequence: number;
    active: number;
}

export const createBrokerRequestActionState = (): BrokerRequestActionState => ({
    sequence: 0,
    active: 0,
});

export const beginBrokerRequestAction = (state: BrokerRequestActionState) => {
    if (state.active !== 0) {
        return null;
    }
    state.sequence += 1;
    state.active = state.sequence;
    return state.active;
};

export const isBrokerRequestActionCurrent = (state: BrokerRequestActionState, generation: number) => (
    state.active === generation
);

export const finishBrokerRequestAction = (state: BrokerRequestActionState, generation: number) => {
    if (!isBrokerRequestActionCurrent(state, generation)) {
        return false;
    }
    state.active = 0;
    return true;
};

export const cancelBrokerRequestAction = (state: BrokerRequestActionState) => {
    state.active = 0;
};

export const hasActiveBrokerRequestAction = (state: BrokerRequestActionState) => state.active !== 0;
