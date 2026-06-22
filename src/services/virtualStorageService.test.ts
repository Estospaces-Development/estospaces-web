import test from "node:test";
import assert from "node:assert/strict";

import {
  createVirtualStorageCategory,
  declineVirtualStorageSave,
  getVirtualStorageCategories,
  getVirtualStorageDocuments,
  saveDocumentToVirtualStorage,
} from "@/services/virtualStorageService";

const okResponse = (data: unknown) =>
  ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ success: true, data }),
  }) as Response;

test("virtual storage service uses the core virtual-storage routes", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; method: string; body?: string }> = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({
      url: String(input),
      method: String(init?.method || "GET"),
      body: init?.body ? String(init.body) : undefined,
    });
    return okResponse({ categories: [], documents: [] });
  }) as typeof fetch;

  try {
    await getVirtualStorageCategories();
    await createVirtualStorageCategory({ name: "School admissions" });
    await getVirtualStorageDocuments();
    await saveDocumentToVirtualStorage("doc-1", { category_id: "cat-1" });
    await declineVirtualStorageSave("doc-1");
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(
    requests[0].url,
    "http://localhost:8080/api/v1/virtual-storage/categories",
  );
  assert.equal(requests[1].method, "POST");
  assert.equal(
    requests[1].body,
    JSON.stringify({ name: "School admissions" }),
  );
  assert.equal(
    requests[2].url,
    "http://localhost:8080/api/v1/virtual-storage/documents",
  );
  assert.equal(
    requests[3].url,
    "http://localhost:8080/api/v1/virtual-storage/documents/doc-1/save",
  );
  assert.equal(
    requests[3].body,
    JSON.stringify({ category_id: "cat-1" }),
  );
  assert.equal(
    requests[4].url,
    "http://localhost:8080/api/v1/virtual-storage/documents/doc-1/decline-save",
  );
});
