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

const normalized = (value?: string | null) => String(value || "").trim();
const CASE_FILE_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const CASE_FILE_INVALID_REFERENCE_MESSAGE =
  "Enter a valid case reference to open the shared case file.";

export const sanitizeCaseFileRouteCaseId = (value?: string | null) => {
  const caseId = normalized(value);
  if (!caseId) {
    return {
      caseId: "",
      error: "A case reference is required to open the shared case file.",
    };
  }

  if (caseId.length > 64 || !CASE_FILE_UUID_PATTERN.test(caseId)) {
    return {
      caseId: "",
      error: CASE_FILE_INVALID_REFERENCE_MESSAGE,
    };
  }

  return {
    caseId,
    error: null,
  };
};

export const buildCaseFileMutationContext = (
  caseFile: CaseFileContextLike,
  request?: CaseFileRequestContextLike | null,
) => ({
  user_id: normalized(request?.user_id) || normalized(caseFile.user_id),
  manager_id:
    normalized(request?.manager_id) || normalized(caseFile.manager_id),
  lead_id: normalized(request?.lead_id) || normalized(caseFile.lead_id),
  application_id:
    normalized(request?.application_id) || normalized(caseFile.application_id),
  contract_id:
    normalized(request?.contract_id) || normalized(caseFile.contract_id),
  property_id:
    normalized(request?.property_id) || normalized(caseFile.property_id),
});

export const buildCaseFileUploadContext = (
  caseFile: CaseFileContextLike,
  request?: CaseFileRequestContextLike | null,
) => ({
  fastTrackCaseId: normalized(caseFile.case_id),
  targetUserId: normalized(request?.user_id) || normalized(caseFile.user_id),
  leadId: normalized(request?.lead_id) || normalized(caseFile.lead_id),
  applicationId:
    normalized(request?.application_id) || normalized(caseFile.application_id),
  contractId:
    normalized(request?.contract_id) || normalized(caseFile.contract_id),
  propertyId:
    normalized(request?.property_id) || normalized(caseFile.property_id),
  managerId: normalized(request?.manager_id) || normalized(caseFile.manager_id),
});
