import { createLead } from '@/services/leadsService';
import {
    requestFastTrack,
    type CreateFastTrackRequest,
    type RequestFastTrackRequest,
} from '@/services/fastTrackService';

export type FastTrackRequestStatus = 'idle' | 'requesting' | 'requested';

export interface FastTrackRequestProperty {
    id: string;
    title: string;
    listing_type?: string;
    country?: string;
    manager_id?: string;
}

interface FastTrackRequestLead {
    id: string;
    broker_request_id?: string;
    matched_broker_id?: string;
    broker_id?: string;
}

interface DirectFastTrackRequestDependencies {
    createLead: typeof createLead;
    requestFastTrack: (
        request: RequestFastTrackRequest,
    ) => ReturnType<typeof requestFastTrack>;
}

const defaultDependencies: DirectFastTrackRequestDependencies = {
    createLead,
    requestFastTrack,
};

export const mapFastTrackPropertyType = (listingType?: string) => {
    if (listingType === 'sale') {
        return 'buy';
    }
    if (listingType === 'lease') {
        return 'lease';
    }
    if (listingType === 'rent') {
        return 'rent';
    }
    return null;
};

export const buildPropertyFastTrackStartRequest = ({
    property,
    lead,
    brokerRequestQuery,
    clientId,
    clientName,
}: {
    property: FastTrackRequestProperty;
    lead: FastTrackRequestLead | null;
    brokerRequestQuery: string;
    clientId: string;
    clientName: string;
}): CreateFastTrackRequest | null => {
    const fastTrackPropertyType = mapFastTrackPropertyType(property.listing_type);
    if (!fastTrackPropertyType) {
        return null;
    }

    const brokerRequestId = brokerRequestQuery || lead?.broker_request_id || undefined;
    const startsFromBrokerRequest = Boolean(brokerRequestId);
    const managerId = lead?.matched_broker_id || lead?.broker_id || property.manager_id || undefined;

    return {
        property_id: property.id,
        broker_request_id: brokerRequestId,
        lead_id: startsFromBrokerRequest ? undefined : lead?.id,
        manager_id: managerId,
        client_id: clientId,
        client_name: clientName,
        property_title: property.title,
        property_type: fastTrackPropertyType,
        property_country: property.country || undefined,
        listing_type: ['rent', 'sale', 'lease'].includes(property.listing_type || '')
            ? property.listing_type as 'rent' | 'sale' | 'lease'
            : undefined,
        started_from: startsFromBrokerRequest ? 'broker_request_selection' : 'direct_property',
    };
};

export const requestDirectPropertyFastTrack = async ({
    property,
    clientId,
    clientName,
    dependencies = defaultDependencies,
}: {
    property: FastTrackRequestProperty;
    clientId: string;
    clientName: string;
    dependencies?: DirectFastTrackRequestDependencies;
}) => {
    if (!mapFastTrackPropertyType(property.listing_type)) {
        throw new Error('Fast Track is not available for short-term listings yet.');
    }

    const leadResult = await dependencies.createLead(property.id);
    if (leadResult.error || !leadResult.data) {
        throw new Error(leadResult.error || 'Unable to prepare the Fast Track request.');
    }

    const request = buildPropertyFastTrackStartRequest({
        property,
        lead: leadResult.data,
        brokerRequestQuery: '',
        clientId,
        clientName,
    });
    if (!request) throw new Error('Unable to prepare the Fast Track request.');

    const userRequest: RequestFastTrackRequest = {
        property_id: request.property_id,
        broker_request_id: request.broker_request_id,
        lead_id: request.lead_id,
        client_name: request.client_name,
        property_title: request.property_title,
        property_type: request.property_type,
        property_country: request.property_country,
        listing_type: request.listing_type,
    };
    const result = await dependencies.requestFastTrack(userRequest);
    if (result.error || !result.requested || !result.requestedAt) {
        throw new Error(result.error || 'Unable to send the Fast Track request.');
    }

    return {
        leadId: leadResult.data.id,
        requestedAt: result.requestedAt,
    };
};
