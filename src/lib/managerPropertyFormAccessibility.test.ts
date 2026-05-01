import test from 'node:test';
import assert from 'node:assert/strict';

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
    helpText: 'MP4, MOV, AVI up to 50MB each',
  });
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
