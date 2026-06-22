import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const registerPage = readFileSync(resolve(root, "src/pages/auth/register/page.tsx"), "utf8");
const forgotPage = readFileSync(resolve(root, "src/pages/auth/forgot-password/page.tsx"), "utf8");
const resetPage = readFileSync(resolve(root, "src/pages/auth/reset-password/page.tsx"), "utf8");
const verifyEmailPage = readFileSync(resolve(root, "src/pages/auth/verify-email/page.tsx"), "utf8");
const faqPage = readFileSync(resolve(root, "src/pages/public/faq/page.tsx"), "utf8");
const contactPage = readFileSync(resolve(root, "src/pages/public/contact/page.tsx"), "utf8");

test("register form exposes role selection and field labels", () => {
  assert.match(registerPage, /id="register-role-label"/);
  assert.match(registerPage, /role="group"/);
  assert.match(registerPage, /aria-labelledby="register-role-label"/);
  assert.match(registerPage, /aria-pressed=\{role === 'user'\}/);
  assert.match(registerPage, /aria-pressed=\{role === 'manager'\}/);
  assert.match(registerPage, /htmlFor="register-name"/);
  assert.match(registerPage, /id="register-name"/);
  assert.match(registerPage, /htmlFor="register-email"/);
  assert.match(registerPage, /id="register-email"/);
  assert.match(registerPage, /htmlFor="register-password"/);
  assert.match(registerPage, /id="register-password"/);
});

test("password recovery pages use page headings and connected labels", () => {
  assert.match(forgotPage, /<h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-2 text-center">/);
  assert.match(forgotPage, /<h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Check your email<\/h2>/);
  assert.match(forgotPage, /htmlFor="forgot-password-email"/);
  assert.match(forgotPage, /id="forgot-password-email"/);
  assert.match(resetPage, /<h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-2 text-center">/);
  assert.match(resetPage, /htmlFor="reset-password-new"/);
  assert.match(resetPage, /id="reset-password-new"/);
  assert.match(resetPage, /htmlFor="reset-password-confirm"/);
  assert.match(resetPage, /id="reset-password-confirm"/);
  assert.match(resetPage, /aria-label=\{showPassword \? 'Hide new password' : 'Show new password'\}/);
  assert.match(resetPage, /aria-label=\{showConfirmPassword \? 'Hide confirmation password' : 'Show confirmation password'\}/);
  assert.match(verifyEmailPage, /<h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">/);
  assert.match(verifyEmailPage, /htmlFor="verify-email-resend"/);
  assert.match(verifyEmailPage, /id="verify-email-resend"/);
  assert.match(verifyEmailPage, /type="button"[\s\S]*?onClick=\{handleResend\}/);
});

test("faq search, category tabs, and accordions expose state", () => {
  assert.match(faqPage, /aria-label="Search FAQs"/);
  assert.match(faqPage, /aria-pressed=\{activeCategory === cat\.id\}/);
  assert.match(faqPage, /aria-expanded=\{Boolean\(openItems\[faq\.id\]\)\}/);
  assert.match(faqPage, /aria-controls=\{`faq-answer-\$\{faq\.id\}`\}/);
  assert.match(faqPage, /id=\{`faq-answer-\$\{faq\.id\}`\}/);
  assert.match(faqPage, /<h2 className="text-lg font-medium text-gray-900 mb-2">No results found<\/h2>/);
  assert.match(faqPage, /<h2 className="text-xl font-semibold mb-2">Still have questions\?<\/h2>/);
});

test("contact page buttons and card headings stay accessible", () => {
  assert.match(contactPage, /type="button"[\s\S]*?onClick=\{handleBack\}/);
  assert.match(contactPage, /<h2 className="font-semibold text-gray-900 dark:text-white mb-1">Email Us<\/h2>/);
  assert.match(contactPage, /<h2 className="font-semibold text-gray-900 dark:text-white mb-1">Call Us<\/h2>/);
  assert.match(contactPage, /<h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Email Draft Ready<\/h2>/);
  assert.match(contactPage, /type="button"[\s\S]*?onClick=\{\(\) => setIsSubmitted\(false\)\}/);
});
