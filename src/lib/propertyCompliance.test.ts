import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildLatestPropertyComplianceEvidenceMap,
    createPropertyComplianceDrafts,
    dedupeJourneyBlockers,
    getOfferReadinessBlockers,
    getOfferReadinessRequirements,
    getPropertyComplianceStatusLabel,
    getPropertyCompliancePublishBlockerMessage,
    isPropertyOfferReady,
    isPropertyContractReady,
    normalizePropertyComplianceCode,
} from './propertyCompliance';

test('offer-readiness helpers only expose seller-side offer requirements and blockers', () => {
    const readiness = {
        status: 'attention_required',
        required_evidence: [
            { code: 'seller_instruction_record', label: 'Seller instruction record', scope: 'offer_readiness', status: 'missing' },
            { code: 'material_information_pack', label: 'Material information pack', scope: 'offer_readiness', status: 'missing' },
            { code: 'epc', label: 'EPC', scope: 'marketing', status: 'missing' },
        ],
        blockers: [
            { code: 'seller_instruction_record', scope: 'offer_readiness', title: 'Seller instruction record is still required' },
            { code: 'epc', scope: 'marketing', title: 'EPC is still required' },
        ],
    };

    assert.deepEqual(
        getOfferReadinessRequirements(readiness as any).map((item) => item.code),
        ['seller_instruction_record', 'material_information_pack'],
    );
    assert.deepEqual(
        getOfferReadinessBlockers(readiness as any).map((item) => item.code),
        ['seller_instruction_record'],
    );
});

test('journey blocker helpers collapse repeated readiness errors before rendering', () => {
    const blockers = [
        {
            code: 'property_property_readiness_unavailable',
            scope: 'contract_readiness',
            severity: 'high',
            title: 'Property readiness unavailable',
            description: 'property compliance readiness returned 429: Too many requests. Please try again later.',
        },
        {
            code: 'property_property_readiness_unavailable',
            scope: 'contract_readiness',
            severity: 'high',
            title: 'Property readiness unavailable',
            description: 'property compliance readiness returned 429: Too many requests. Please try again later.',
        },
        {
            code: 'property_gas_safety_record',
            scope: 'contract_readiness',
            severity: 'high',
            title: 'Gas safety record is still required',
            description: 'Track the current gas safety evidence where gas appliances exist.',
        },
    ];

    assert.deepEqual(
        dedupeJourneyBlockers(blockers as any).map((item) => item.code),
        ['property_property_readiness_unavailable', 'property_gas_safety_record'],
    );
});

test('latest compliance evidence wins when multiple records exist for the same category', () => {
    const evidenceMap = buildLatestPropertyComplianceEvidenceMap([
        {
            id: 'older',
            property_id: 'property-1',
            category: 'seller_instruction_record',
            jurisdiction: 'england',
            status: 'pending',
            created_by: 'manager-1',
            updated_by: 'manager-1',
            created_at: '2026-03-28T09:00:00Z',
            updated_at: '2026-03-28T09:00:00Z',
        },
        {
            id: 'newer',
            property_id: 'property-1',
            category: 'seller_instruction_record',
            jurisdiction: 'england',
            status: 'completed',
            created_by: 'manager-1',
            updated_by: 'manager-1',
            created_at: '2026-03-28T09:15:00Z',
            updated_at: '2026-03-28T09:30:00Z',
            reference_number: 'SELL-123',
        },
    ] as any);

    assert.equal(evidenceMap.get('seller_instruction_record')?.id, 'newer');
    assert.equal(evidenceMap.get('seller_instruction_record')?.reference_number, 'SELL-123');
});

test('drafts normalize satisfied statuses into editable purchase-workflow values', () => {
    const requirements = [
        { code: 'seller_instruction_record', label: 'Seller instruction record', status: 'satisfied', scope: 'offer_readiness' },
        { code: 'material_information_pack', label: 'Material information pack', status: 'missing', scope: 'offer_readiness' },
    ];
    const evidenceMap = buildLatestPropertyComplianceEvidenceMap([
        {
            id: 'evidence-1',
            property_id: 'property-1',
            category: 'seller_instruction_record',
            jurisdiction: 'england',
            status: 'approved',
            reference_number: 'AUTH-01',
            review_notes: 'Seller signed the instruction pack.',
            created_by: 'manager-1',
            updated_by: 'manager-1',
            created_at: '2026-03-28T09:00:00Z',
            updated_at: '2026-03-28T10:00:00Z',
        },
    ] as any);

    const drafts = createPropertyComplianceDrafts(requirements as any, evidenceMap);

    assert.deepEqual(drafts.seller_instruction_record, {
        status: 'completed',
        referenceNumber: 'AUTH-01',
        reviewNotes: 'Seller signed the instruction pack.',
    });
    assert.deepEqual(drafts.material_information_pack, {
        status: 'pending',
        referenceNumber: '',
        reviewNotes: '',
    });
    assert.equal(getPropertyComplianceStatusLabel('approved'), 'Completed');
    assert.equal(getPropertyComplianceStatusLabel('waived'), 'Waived');
    assert.equal(getPropertyComplianceStatusLabel('missing'), 'Pending');
});

test('property-prefixed readiness codes normalize onto the backend evidence category', () => {
    const requirements = [
        { code: 'property_tenancy_support_pack', label: 'Tenancy support pack', status: 'missing', scope: 'contract_issue' },
    ];
    const evidenceMap = buildLatestPropertyComplianceEvidenceMap([
        {
            id: 'evidence-1',
            property_id: 'property-1',
            category: 'tenancy_support_pack',
            jurisdiction: 'england',
            status: 'approved',
            reference_number: 'PACK-101',
            review_notes: 'Pack ready',
            created_by: 'manager-1',
            updated_by: 'manager-1',
            created_at: '2026-03-28T09:00:00Z',
            updated_at: '2026-03-28T10:00:00Z',
        },
    ] as any);

    const drafts = createPropertyComplianceDrafts(requirements as any, evidenceMap);

    assert.equal(normalizePropertyComplianceCode('property_tenancy_support_pack'), 'tenancy_support_pack');
    assert.deepEqual(drafts.property_tenancy_support_pack, {
        status: 'completed',
        referenceNumber: 'PACK-101',
        reviewNotes: 'Pack ready',
    });
});

test('offer readiness is gated by the seller pack status', () => {
    assert.equal(isPropertyOfferReady({ status: 'offer_ready' } as any), true);
    assert.equal(isPropertyOfferReady({ status: 'attention_required' } as any), false);
    assert.equal(isPropertyOfferReady(null), false);
});

test('contract readiness only unlocks when the property pack is contract-ready or move-in-ready', () => {
    assert.equal(isPropertyContractReady({ status: 'contract_ready' } as any), true);
    assert.equal(isPropertyContractReady({ status: 'move_in_ready' } as any), true);
    assert.equal(isPropertyContractReady({ status: 'offer_ready' } as any), false);
    assert.equal(isPropertyContractReady(null), false);
});

test('publish blocker message is readiness-specific and deduped', () => {
    const readiness = {
        status: 'attention_required',
        blockers: [
            {
                code: 'epc',
                scope: 'marketing',
                title: 'EPC is still required',
                description: 'Track the current EPC before the property is treated as fully market-ready.',
            },
            {
                code: 'epc',
                scope: 'marketing',
                title: 'EPC is still required',
                description: 'Track the current EPC before the property is treated as fully market-ready.',
            },
            {
                code: 'gas_safety_record',
                scope: 'move_in',
                title: 'Gas safety record is still required',
                description: 'Track the current gas safety evidence where gas appliances exist.',
            },
        ],
    };

    assert.equal(
        getPropertyCompliancePublishBlockerMessage(readiness as any),
        'Resolve compliance readiness before publishing: EPC is still required; Gas safety record is still required.',
    );
});
