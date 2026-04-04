export interface CaseFileRequestLike {
  title?: string;
  link_family?: string;
  visibility?: string;
  requirement_codes?: string[];
}

export interface CaseFileDocumentLike {
  id?: string;
  status?: string;
  document_category?: string;
  document_type?: string;
  document?: {
    document_category?: string;
    document_type?: string;
  };
}

export interface CaseFileUploadDescriptor {
  uploadType: string;
  documentType: string;
  documentCategory: string;
  linkFamily: string;
  visibility: string;
}

export interface CaseFileSummary {
  approvedCount: number;
  pendingReviewCount: number;
  reuploadCount: number;
  openRequestCount: number;
  totalRequestCount: number;
}

export interface CaseFileRequestMatch<TRequest = CaseFileRequestLike> {
  request: TRequest | null;
  ambiguous: boolean;
}

const CLIENT_REUSABLE = "client_reusable";
const CASE_TRANSACTIONAL = "case_transactional";
const SHARED_WITH_USER = "shared_with_user";
const GENERIC_FILE_TOKENS = new Set([
  "additional",
  "copy",
  "document",
  "documents",
  "evidence",
  "file",
  "files",
  "further",
  "supporting",
]);

const includesToken = (haystack: string, tokens: string[]) =>
  tokens.some((token) => haystack.includes(token));

const tokenize = (value: string) =>
  value
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .map((item) => item.trim())
    .filter((item) => item.length >= 3);

export const inferCaseFileUploadDescriptor = (
  request?: CaseFileRequestLike | null,
): CaseFileUploadDescriptor => {
  const codes = (request?.requirement_codes || [])
    .map((item) =>
      String(item || "")
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean);
  const title = String(request?.title || "")
    .trim()
    .toLowerCase();
  const searchText = [title, ...codes].join(" ");
  const linkFamily =
    String(request?.link_family || "").trim() || CLIENT_REUSABLE;
  const visibility =
    String(request?.visibility || "").trim() || SHARED_WITH_USER;

  if (
    includesToken(searchText, [
      "identity",
      "passport",
      "photo id",
      "government id",
    ])
  ) {
    return {
      uploadType: "identity",
      documentType: "government_id",
      documentCategory: "identity",
      linkFamily,
      visibility,
    };
  }

  if (includesToken(searchText, ["address", "utility", "council_tax"])) {
    return {
      uploadType: "address",
      documentType: "address_proof",
      documentCategory: "address",
      linkFamily,
      visibility,
    };
  }

  if (
    includesToken(searchText, [
      "proof_of_funds",
      "mip",
      "mortgage",
      "source_of_funds",
      "bank_statement",
      "income",
    ])
  ) {
    return {
      uploadType: "proof_of_funds",
      documentType: "proof_of_funds",
      documentCategory: "financial",
      linkFamily,
      visibility,
    };
  }

  if (includesToken(searchText, ["employment", "salary", "payslip"])) {
    return {
      uploadType: "employment",
      documentType: "employment_proof",
      documentCategory: "employment",
      linkFamily,
      visibility,
    };
  }

  if (includesToken(searchText, ["reference", "landlord_reference"])) {
    return {
      uploadType: "reference",
      documentType: "reference_letter",
      documentCategory: "reference",
      linkFamily,
      visibility,
    };
  }

  if (
    includesToken(searchText, [
      "contract",
      "agreement",
      "tenancy",
      "memorandum",
      "offer",
      "invoice",
      "receipt",
      "deposit",
    ])
  ) {
    return {
      uploadType: "transactional",
      documentType: "transaction_document",
      documentCategory: "transactional",
      linkFamily: linkFamily || CASE_TRANSACTIONAL,
      visibility,
    };
  }

  return {
    uploadType: "supporting_document",
    documentType: "supporting_document",
    documentCategory: "supporting",
    linkFamily,
    visibility,
  };
};

export const matchCaseFileRequestForFileName = <
  TRequest extends CaseFileRequestLike,
>(
  fileName: string,
  requests: TRequest[] = [],
): CaseFileRequestMatch<TRequest> => {
  if (requests.length === 0) {
    return {
      request: null,
      ambiguous: false,
    };
  }

  const fileTokens = tokenize(fileName);
  const scored = requests
    .map((request) => {
      const descriptor = inferCaseFileUploadDescriptor(request);
      const requestTokens = tokenize(
        `${request.title || ""} ${(request.requirement_codes || []).join(" ")}`,
      );
      const overlap = requestTokens.filter((token) => fileTokens.includes(token));
      const strongOverlap = overlap.filter(
        (token) => !GENERIC_FILE_TOKENS.has(token),
      );
      const descriptorMatches = tokenize(
        `${descriptor.documentCategory} ${descriptor.documentType} ${descriptor.uploadType}`,
      ).filter(
        (token) =>
          fileTokens.includes(token) && !GENERIC_FILE_TOKENS.has(token),
      );
      const score = strongOverlap.length * 4 + descriptorMatches.length * 2;

      return {
        request,
        score,
        onlyGeneric: score === 0 && overlap.length > 0,
      };
    })
    .sort((left, right) => right.score - left.score);

  const strongest = scored[0];
  if (!strongest) {
    return {
      request: null,
      ambiguous: false,
    };
  }

  const hasUsefulScore = strongest.score > 0;
  const nextStrongest = scored[1];

  if (!hasUsefulScore) {
    if (requests.length === 1) {
      return {
        request: requests[0],
        ambiguous: false,
      };
    }

    return {
      request: null,
      ambiguous: true,
    };
  }

  if (strongest.onlyGeneric && requests.length > 1) {
    return {
      request: null,
      ambiguous: true,
    };
  }

  if (nextStrongest && nextStrongest.score === strongest.score) {
    return {
      request: null,
      ambiguous: true,
    };
  }

  return {
    request: strongest.request,
    ambiguous: false,
  };
};

export const summarizeCaseFileDocuments = (
  documents: CaseFileDocumentLike[] = [],
  requests: Array<{ status?: string }> = [],
): CaseFileSummary => ({
  approvedCount: documents.filter(
    (item) => String(item.status || "").trim() === "approved",
  ).length,
  pendingReviewCount: documents.filter((item) =>
    ["uploaded", "under_review", "linked"].includes(
      String(item.status || "").trim(),
    ),
  ).length,
  reuploadCount: documents.filter(
    (item) => String(item.status || "").trim() === "reupload_required",
  ).length,
  openRequestCount: requests.filter(
    (item) =>
      !["approved", "waived"].includes(String(item.status || "").trim()),
  ).length,
  totalRequestCount: requests.length,
});

export const filterReusableDocumentsForRequest = <
  TDocument extends CaseFileDocumentLike,
>(
  documents: TDocument[] = [],
  request?: CaseFileRequestLike | null,
) => {
  const descriptor = inferCaseFileUploadDescriptor(request);
  return documents.filter((item) => {
    const category = String(
      item.document_category || item.document?.document_category || "",
    )
      .trim()
      .toLowerCase();
    const type = String(
      item.document_type || item.document?.document_type || "",
    )
      .trim()
      .toLowerCase();
    return (
      category === descriptor.documentCategory ||
      type === descriptor.documentType
    );
  });
};
