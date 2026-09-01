import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  getManagerPropertyAddressRevalidationFields,
  getManagerPropertyAuditSummary,
  getManagerPropertyErrorId,
  getManagerPropertyFieldId,
  getManagerPropertyFieldState,
  getManagerPropertyFormStatusMessage,
  getManagerPropertySubmitIntent,
  getManagerPropertyUploadControlCopy,
} from './managerPropertyFormAccessibility';

const managerPropertyFormPage = readFileSync(
  resolve(process.cwd(), 'src/pages/manager/dashboard/properties/add/page.tsx'),
  'utf8',
);

test('manager property form field helpers create stable label and error wiring', () => {
  assert.equal(getManagerPropertyFieldId('title'), 'manager-property-title');
  assert.equal(getManagerPropertyErrorId('priceAmount'), 'manager-property-priceAmount-error');
  assert.deepEqual(getManagerPropertyFieldState('priceAmount', { priceAmount: 'Price is required' }), {
    id: 'manager-property-priceAmount',
    'aria-invalid': true,
    'aria-describedby': 'manager-property-priceAmount-error',
  });
});

test('manager property form field helpers omit error description when valid', () => {
  assert.deepEqual(getManagerPropertyFieldState('title', {}), {
    id: 'manager-property-title',
    'aria-invalid': false,
    'aria-describedby': undefined,
  });
});

test('manager property form status announces the current step and errors', () => {
  assert.equal(
    getManagerPropertyFormStatusMessage({
      mode: 'create',
      currentStep: 1,
      totalSteps: 5,
      currentStepTitle: 'Basic Info',
      errorCount: 2,
      saving: false,
    }),
    'Create property form step 1 of 5: Basic Info. 2 fields need attention.',
  );

  assert.equal(
    getManagerPropertyFormStatusMessage({
      mode: 'edit',
      currentStep: 5,
      totalSteps: 5,
      currentStepTitle: 'Contact',
      errorCount: 0,
      saving: true,
    }),
    'Saving edit property form. Step 5 of 5: Contact.',
  );

  assert.equal(
    getManagerPropertyFormStatusMessage({
      mode: 'edit',
      currentStep: 5,
      totalSteps: 5,
      currentStepTitle: 'Contact',
      errorCount: 0,
      saving: false,
      submissionBlocker: 'Complete manager verification before submitting.',
    }),
    'Edit property form step 5 of 5: Contact. All visible fields are valid. Submission blocked: Complete manager verification before submitting.',
  );

  assert.equal(
    getManagerPropertyFormStatusMessage({
      mode: 'create',
      currentStep: 1,
      totalSteps: 5,
      currentStepTitle: 'Basic Info',
      errorCount: 0,
      incompleteRequiredCount: 9,
      saving: false,
      submissionBlocker: 'Complete all required property details before submitting.',
    }),
    'Create property form step 1 of 5: Basic Info. 9 required fields are still incomplete. Submission blocked: Complete all required property details before submitting.',
  );
});

test('manager property upload controls expose button copy and format help', () => {
  assert.deepEqual(getManagerPropertyUploadControlCopy('images'), {
    buttonLabel: 'Click to upload images',
    ariaLabel: 'Upload property images',
    helpText: 'PNG, JPG, JPEG, WEBP up to 10MB each',
  });

  assert.deepEqual(getManagerPropertyUploadControlCopy('videos'), {
    buttonLabel: 'Click to upload videos',
    ariaLabel: 'Upload property videos',
    helpText: 'MP4, WebM, MOV up to 30MB each',
  });
});

test('manager property media empty state does not contradict selected previews', () => {
  assert.match(
    managerPropertyFormPage,
    /imagePreviews\.length > 0 \|\| videoPreviews\.length > 0[\s\S]*Selected media is ready below/,
  );
});

test('manager property edit submit intent saves instead of advancing steps', () => {
  assert.equal(
    getManagerPropertySubmitIntent({ mode: 'create', currentStep: 1, totalSteps: 5 }),
    'advance-step',
  );
  assert.equal(
    getManagerPropertySubmitIntent({ mode: 'create', currentStep: 5, totalSteps: 5 }),
    'save-property',
  );
  assert.equal(
    getManagerPropertySubmitIntent({ mode: 'edit', currentStep: 1, totalSteps: 5 }),
    'save-property',
  );
});

test('manager property location changes always revalidate required address fields', () => {
  assert.deepEqual(getManagerPropertyAddressRevalidationFields(), [
    'country',
    'state',
    'city',
    'addressLine1',
    'postalCode',
    'latitude',
    'longitude',
  ]);
});

test('manager property audit summary exposes actor action and reason', () => {
  assert.equal(
    getManagerPropertyAuditSummary({
      mode: 'edit',
      status: 'draft',
      currentStepTitle: 'Location',
      actorName: 'Proof Estates',
      reason: 'Corrected postcode after viewing confirmation.',
    }),
    'Audit trail preview. Actor: Proof Estates. Action: Update Location. Status: draft. Reason: Corrected postcode after viewing confirmation.',
  );

  assert.equal(
    getManagerPropertyAuditSummary({
      mode: 'create',
      status: 'draft',
      currentStepTitle: 'Basic Info',
      actorName: '',
      reason: '',
    }),
    'Audit trail preview. Actor: Current manager. Action: Create Basic Info. Status: draft. Reason: Manager created property listing.',
  );
});

test('manager property form uses in-app dialogs for unsaved navigation and media removal', () => {
  assert.doesNotMatch(managerPropertyFormPage, /window\.confirm/);
  assert.match(managerPropertyFormPage, /aria-label="Unsaved property changes confirmation"/);
  assert.match(managerPropertyFormPage, /aria-label="Remove property media confirmation"/);
});

test('manager property create form supports India and UK from user country context', () => {
  assert.match(managerPropertyFormPage, /code:\s*LAUNCH_COUNTRY_CODE,\s*name:\s*"India",\s*currency:\s*"INR"/);
  assert.match(managerPropertyFormPage, /code:\s*UK_COUNTRY_CODE,\s*name:\s*"United Kingdom",\s*currency:\s*"GBP"/);
  assert.match(managerPropertyFormPage, /resolveDefaultCountryForUser\(user\)/);
});

test('manager property submit button is disabled until required fields are complete', () => {
  assert.match(managerPropertyFormPage, /const\s+fullFormErrors\s*=\s*validateAllFields\(\)/);
  assert.match(managerPropertyFormPage, /const\s+hasFullFormValidationErrors\s*=\s*fullFormErrorCount\s*>\s*0/);
  assert.match(
    managerPropertyFormPage,
    /Boolean\(submissionBlocker\)\s*\|\|\s*hasFullFormValidationErrors/,
  );
  assert.match(
    managerPropertyFormPage,
    /Complete all required property details before submitting\./,
  );
  assert.match(managerPropertyFormPage, /\? "Complete the required fields"/);
  assert.match(managerPropertyFormPage, /The submit action stays disabled until they are corrected\./);
});

test('manager property numeric requirements are visible before advancing', () => {
  for (const fieldName of ['balconies', 'parkingSpaces', 'totalFloors']) {
    const labelPattern = new RegExp(
      `htmlFor=\\{getManagerPropertyFieldId\\("${fieldName}"\\)\\}[\\s\\S]*?aria-hidden="true">\\*<`,
    );
    const inputPattern = new RegExp(
      `\\{\\.\\.\\.fieldState\\("${fieldName}"\\)\\}[\\s\\S]*?required`,
    );
    assert.match(managerPropertyFormPage, labelPattern, `${fieldName} must show a required marker`);
    assert.match(managerPropertyFormPage, inputPattern, `${fieldName} must expose native required state`);
  }
});

test('manager property money fields display the selected currency symbol', () => {
  assert.match(managerPropertyFormPage, /import\s*\{\s*getCurrencySymbol\s*\}\s*from\s*"@\/lib\/utils\/currency"/);
  assert.match(managerPropertyFormPage, /const\s+displayCurrency\s*=\s*getCurrencySymbol\(formData\.currency\)/);
  assert.match(managerPropertyFormPage, /\{displayCurrency\}[\s\S]*<input[\s\S]*\{renderFieldError\("priceAmount"\)\}/);
  assert.match(managerPropertyFormPage, /Security Deposit \(\{displayCurrency\}\)/);
  assert.match(managerPropertyFormPage, /Maintenance Charges \(\{displayCurrency\}\/month\)/);
});

test('manager property location uses address lookup, current location, and a map picker', () => {
  assert.match(managerPropertyFormPage, /PropertyLocationPicker/);
  assert.match(managerPropertyFormPage, /getCoordinatesFromAddress/);
  assert.match(managerPropertyFormPage, /getUserGeolocation/);
  assert.match(managerPropertyFormPage, /addressChanged \? "" : formData\.latitude/);
  assert.match(managerPropertyFormPage, /onLocationChange=\{handleMapLocationChange\}/);
  assert.doesNotMatch(managerPropertyFormPage, />\s*Latitude\s*</);
  assert.doesNotMatch(managerPropertyFormPage, />\s*Longitude\s*</);
});
