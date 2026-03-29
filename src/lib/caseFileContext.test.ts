import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCaseFileMutationContext, buildCaseFileUploadContext } from './caseFileContext';

test('case-file mutation context keeps snake_case ids for case-file APIs', () => {
    const caseFile = {
        case_id: 'case-1',
        user_id: 'user-1',
        manager_id: 'manager-1',
        lead_id: 'lead-1',
        application_id: 'application-1',
        contract_id: 'contract-1',
        property_id: 'property-1',
    };

    assert.deepEqual(
        buildCaseFileMutationContext(caseFile, {
            lead_id: 'lead-2',
            application_id: 'application-2',
        }),
        {
            user_id: 'user-1',
            manager_id: 'manager-1',
            lead_id: 'lead-2',
            application_id: 'application-2',
            contract_id: 'contract-1',
            property_id: 'property-1',
        },
    );
});

test('case-file upload context maps the same ids into uploadDocument camelCase options', () => {
    const caseFile = {
        case_id: 'case-1',
        user_id: 'user-1',
        manager_id: 'manager-1',
        lead_id: 'lead-1',
        application_id: 'application-1',
        contract_id: '',
        property_id: 'property-1',
    };

    assert.deepEqual(
        buildCaseFileUploadContext(caseFile, {
            manager_id: 'manager-2',
            lead_id: 'lead-2',
        }),
        {
            fastTrackCaseId: 'case-1',
            leadId: 'lead-2',
            applicationId: 'application-1',
            contractId: '',
            propertyId: 'property-1',
            managerId: 'manager-2',
        },
    );
});
