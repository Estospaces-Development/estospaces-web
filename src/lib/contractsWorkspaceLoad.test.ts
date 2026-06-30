import test from "node:test";
import assert from "node:assert/strict";

import {
  getCreateContractEntryState,
  getDraftableContractApplications,
  loadContractsWorkspaceInitialData,
  loadContractsWorkspaceSaleProgressions,
} from "./contractsWorkspaceLoad";

test("loadContractsWorkspaceInitialData resolves without waiting for optional sale progressions", async () => {
  const initialData = await loadContractsWorkspaceInitialData({
    getContracts: async () => ({ data: [], error: null }),
    getApplications: async () => ({ data: [], error: null }),
    getFastTrackCases: async () => ({ data: [], error: null }),
  });

  assert.deepEqual(initialData, {
    contracts: [],
    applications: [],
    fastTrackCases: [],
  });
});

test("loadContractsWorkspaceInitialData keeps contract errors blocking", async () => {
  await assert.rejects(
    () =>
      loadContractsWorkspaceInitialData({
        getContracts: async () => ({ data: null, error: "contracts unavailable" }),
        getApplications: async () => ({ data: [], error: null }),
        getFastTrackCases: async () => ({ data: [], error: null }),
      }),
    /contracts unavailable/,
  );
});

test("loadContractsWorkspaceSaleProgressions falls back to an empty list on optional failures", async () => {
  const saleProgressions = await loadContractsWorkspaceSaleProgressions(async () => ({
    data: null,
    error: "sale progressions timed out",
  }));

  assert.deepEqual(saleProgressions, []);
});

test("getDraftableContractApplications finds approved rent applications without contracts", () => {
  const applications = [
    {
      id: "approved-rent",
      status: "approved",
      listing_type: "rent",
    },
    {
      id: "already-contracted",
      status: "approved",
      listing_type: "rent",
    },
    {
      id: "purchase-application",
      status: "approved",
      listing_type: "sale",
    },
    {
      id: "submitted-rent",
      status: "submitted",
      listing_type: "rent",
    },
  ] as any[];
  const contracts = [
    {
      id: "contract-1",
      application_id: "already-contracted",
    },
  ] as any[];

  assert.deepEqual(
    getDraftableContractApplications(applications, contracts).map((application) => application.id),
    ["approved-rent"],
  );
});

test("getCreateContractEntryState does not treat loading data as no draftable applications", () => {
  const state = getCreateContractEntryState({
    loading: true,
    applications: [
      {
        id: "approved-rent",
        status: "approved",
        listing_type: "rent",
      },
    ] as any[],
    contracts: [],
  });

  assert.equal(state.status, "loading");
  assert.equal(state.draftableApplication, null);
});

test("getCreateContractEntryState opens the first draftable rental application after loading", () => {
  const state = getCreateContractEntryState({
    loading: false,
    applications: [
      {
        id: "approved-rent",
        status: "approved",
        listing_type: "rent",
      },
    ] as any[],
    contracts: [],
  });

  assert.equal(state.status, "ready");
  assert.equal(state.draftableApplication?.id, "approved-rent");
});
