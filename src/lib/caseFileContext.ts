interface CaseFileContextLike {
    case_id: string;
    user_id: string;
    manager_id?: string | null;
    lead_id?: string | null;
    application_id?: string | null;
    contract_id?: string | null;
    property_id?: string | null;
}

interface CaseFileRequestContextLike {
    user_id?: string | null;
    manager_id?: string | null;
    lead_id?: string | null;
    application_id?: string | null;
    contract_id?: string | null;
    property_id?: string | null;
}

const normalized = (value?: string | null) => String(value || '').trim();

export const buildCaseFileMutationContext = (
    caseFile: CaseFileContextLike,
    request?: CaseFileRequestContextLike | null,
) => ({
    user_id: normalized(request?.user_id) || normalized(caseFile.user_id),
    manager_id: normalized(request?.manager_id) || normalized(caseFile.manager_id),
    lead_id: normalized(request?.lead_id) || normalized(caseFile.lead_id),
    application_id: normalized(request?.application_id) || normalized(caseFile.application_id),
    contract_id: normalized(request?.contract_id) || normalized(caseFile.contract_id),
    property_id: normalized(request?.property_id) || normalized(caseFile.property_id),
});

export const buildCaseFileUploadContext = (
    caseFile: CaseFileContextLike,
    request?: CaseFileRequestContextLike | null,
) => ({
    fastTrackCaseId: normalized(caseFile.case_id),
    leadId: normalized(request?.lead_id) || normalized(caseFile.lead_id),
    applicationId: normalized(request?.application_id) || normalized(caseFile.application_id),
    contractId: normalized(request?.contract_id) || normalized(caseFile.contract_id),
    propertyId: normalized(request?.property_id) || normalized(caseFile.property_id),
    managerId: normalized(request?.manager_id) || normalized(caseFile.manager_id),
});
