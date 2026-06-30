import type { Application } from "@/services/applicationsService";
import type { FastTrackCase } from "@/services/fastTrackService";
import type { SaleProgression } from "@/services/salesService";
import type { Contract } from "@/types/booking";

type ServiceResult<T> = {
  data: T[] | null;
  error: string | null;
};

type InitialWorkspaceFetchers = {
  getContracts: () => Promise<ServiceResult<Contract>>;
  getApplications: () => Promise<ServiceResult<Application>>;
  getFastTrackCases: () => Promise<ServiceResult<FastTrackCase>>;
};

export type ContractsWorkspaceInitialData = {
  contracts: Contract[];
  applications: Application[];
  fastTrackCases: FastTrackCase[];
};

const asList = <T>(value: T[] | null | undefined): T[] =>
  Array.isArray(value) ? value : [];

const normalizedText = (value: string | null | undefined) =>
  String(value || "").trim().toLowerCase();

const getApplicationListingType = (application: Application) =>
  normalizedText(application.listing_type);

const getApplicationStatus = (application: Application) =>
  normalizedText(application.status);

const getContractApplicationId = (contract: Contract) =>
  normalizedText(contract.application_id);

export const loadContractsWorkspaceInitialData = async ({
  getContracts,
  getApplications,
  getFastTrackCases,
}: InitialWorkspaceFetchers): Promise<ContractsWorkspaceInitialData> => {
  const [contractsResult, applicationsResult, fastTrackResult] =
    await Promise.all([getContracts(), getApplications(), getFastTrackCases()]);

  if (contractsResult.error) {
    throw new Error(contractsResult.error);
  }

  return {
    contracts: asList(contractsResult.data),
    applications: asList(applicationsResult.data),
    fastTrackCases: asList(fastTrackResult.data),
  };
};

export const loadContractsWorkspaceSaleProgressions = async (
  getSaleProgressions: () => Promise<ServiceResult<SaleProgression>>,
): Promise<SaleProgression[]> => {
  const result = await getSaleProgressions();
  return result.error ? [] : asList(result.data);
};

export const getDraftableContractApplications = (
  applications: Application[],
  contracts: Contract[],
) => {
  const contractedApplicationIds = new Set(
    contracts
      .map(getContractApplicationId)
      .filter(Boolean),
  );

  return applications.filter((application) => {
    const status = getApplicationStatus(application);
    const listingType = getApplicationListingType(application);

    return (
      (status === "approved" || status === "ready_for_contract") &&
      listingType === "rent" &&
      !contractedApplicationIds.has(normalizedText(application.id))
    );
  });
};

export type CreateContractEntryState =
  | {
      status: "loading";
      draftableApplication: null;
    }
  | {
      status: "ready";
      draftableApplication: Application;
    }
  | {
      status: "unavailable";
      draftableApplication: null;
    };

export const getCreateContractEntryState = ({
  loading,
  applications,
  contracts,
}: {
  loading: boolean;
  applications: Application[];
  contracts: Contract[];
}): CreateContractEntryState => {
  if (loading) {
    return {
      status: "loading",
      draftableApplication: null,
    };
  }

  const [draftableApplication] = getDraftableContractApplications(
    applications,
    contracts,
  );

  if (draftableApplication) {
    return {
      status: "ready",
      draftableApplication,
    };
  }

  return {
    status: "unavailable",
    draftableApplication: null,
  };
};
