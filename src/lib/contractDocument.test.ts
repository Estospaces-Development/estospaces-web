import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  buildContractPrintableHtml,
  canDownloadContract,
  contractDocumentFileName,
  getContractBodyText,
} from "@/lib/contractDocument";
import type { Contract } from "@/types/booking";

const baseContract: Contract = {
  id: "f19f811a-9894-4cd7-8d4d-f2048797896d",
  property_id: "00e57ad0-3db3-44b8-919d-66bccec37c23",
  manager_id: "manager-1",
  user_id: "user-1",
  contract_type: "tenancy",
  status: "active",
  start_date: "2026-10-01",
  monthly_rent: 45000,
  deposit_amount: 90000,
  terms_and_conditions: "QA tenancy terms 20260627073101\nClause 2: rent due monthly.",
  user_signed_at: "2026-09-20T10:00:00Z",
  manager_signed_at: "2026-09-21T10:00:00Z",
  created_at: "2026-09-19T10:00:00Z",
  updated_at: "2026-09-21T10:00:00Z",
};

const formatAmount = (amount?: number) => `INR ${amount}`;

test("contract body uses terms_and_conditions sent by the booking service", () => {
  assert.equal(getContractBodyText(baseContract), baseContract.terms_and_conditions);
});

test("contract body still prefers legacy content and ignores blank values", () => {
  assert.equal(getContractBodyText({ ...baseContract, content: "Template body" }), "Template body");
  assert.equal(getContractBodyText({ ...baseContract, content: "   " }), baseContract.terms_and_conditions);
  assert.equal(getContractBodyText({ ...baseContract, terms_and_conditions: "  " }), "");
  assert.equal(getContractBodyText(null), "");
});

test("download is enabled for fully signed contracts or a stored PDF only", () => {
  assert.equal(canDownloadContract(baseContract), true);
  assert.equal(canDownloadContract({ ...baseContract, status: "pending_manager_signature", manager_signed_at: undefined }), false);
  assert.equal(canDownloadContract({ ...baseContract, status: "draft", user_signed_at: undefined, manager_signed_at: undefined }), false);
  assert.equal(
    canDownloadContract({ ...baseContract, status: "draft", user_signed_at: undefined, manager_signed_at: undefined, contract_pdf_url: "https://media.example/c.pdf" }),
    true,
  );
  assert.equal(canDownloadContract({ ...baseContract, status: "signed", user_signed_at: undefined, manager_signed_at: undefined }), true);
});

test("printable contract contains the exact contract id, terms and signature state", () => {
  const html = buildContractPrintableHtml(baseContract, {
    formatAmount,
    statusLabel: "Active",
    generatedAt: new Date("2026-09-28T10:00:00Z"),
  });
  assert.match(html, /^<!DOCTYPE html>/);
  assert.ok(html.includes(baseContract.id));
  assert.ok(html.includes("QA tenancy terms 20260627073101\nClause 2: rent due monthly."));
  assert.ok(html.includes("INR 45000/mo"));
  assert.ok(html.includes("INR 90000"));
  assert.ok(html.includes("Signed 20/09/2026"));
  assert.ok(!html.includes("not been signed by both parties"));
  assert.ok(!/<script/i.test(html));
});

test("printable contract escapes stored text so it cannot inject markup", () => {
  const html = buildContractPrintableHtml(
    { ...baseContract, terms_and_conditions: '<script>alert("x")</script> & <b>bold</b>' },
    { formatAmount },
  );
  assert.ok(!html.includes("<script>alert"));
  assert.ok(html.includes("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &lt;b&gt;bold&lt;/b&gt;"));
});

test("printable contract labels a stored contract without terms truthfully", () => {
  const html = buildContractPrintableHtml(
    { ...baseContract, terms_and_conditions: undefined, manager_signed_at: undefined, status: "pending_manager_signature" },
    { formatAmount },
  );
  assert.ok(html.includes("No terms and conditions text is recorded on this contract."));
  assert.ok(html.includes("This agreement has not been signed by both parties."));
});

test("download file name is derived only from safe contract id characters", () => {
  assert.equal(contractDocumentFileName(baseContract), `estospaces-contract-${baseContract.id}.html`);
  assert.equal(contractDocumentFileName({ id: "../x/<y>" }), "estospaces-contract-xy.html");
});

test("user contracts page reads the shared body helper and download gate", () => {
  const source = readFileSync("src/pages/user/dashboard/contracts/page.tsx", "utf8");
  assert.ok(source.includes("getContractBodyText(viewContract)"));
  assert.ok(source.includes("disabled={!canDownloadContract(contract)}"));
  assert.ok(!source.includes("disabled={!contract.contract_pdf_url}"));
  assert.ok(!source.includes("Full contract text is not embedded"));
});
