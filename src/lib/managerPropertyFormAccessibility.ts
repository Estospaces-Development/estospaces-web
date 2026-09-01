export type ManagerPropertyFormMode = 'create' | 'edit';

export interface ManagerPropertyFormStatusInput {
  mode: ManagerPropertyFormMode;
  currentStep: number;
  totalSteps: number;
  currentStepTitle: string;
  errorCount: number;
  incompleteRequiredCount?: number;
  saving: boolean;
  submissionBlocker?: string | null;
}

export type ManagerPropertyUploadKind = 'images' | 'videos';
export type ManagerPropertySubmitIntent = 'advance-step' | 'save-property';

export function getManagerPropertyMediaEmptyStateMessage({
  hasPreviews,
  hasPendingFiles,
}: {
  hasPreviews: boolean;
  hasPendingFiles: boolean;
}): string {
  if (hasPendingFiles) {
    return 'Selected media is ready below. Save the property to add it to My Uploads.';
  }

  if (hasPreviews) {
    return 'This property has saved media shown below. My Uploads lists files added through the media library.';
  }

  return 'No media saved yet. Use the upload area below to add property images and videos.';
}

export interface ManagerPropertyAuditSummaryInput {
  mode: ManagerPropertyFormMode;
  status: string;
  currentStepTitle: string;
  actorName: string;
  reason: string;
}

export function getManagerPropertyFieldId(field: string): string {
  return `manager-property-${field}`;
}

export function getManagerPropertyErrorId(field: string): string {
  return `${getManagerPropertyFieldId(field)}-error`;
}

export function getManagerPropertyFieldState(
  field: string,
  errors: Record<string, string>,
) {
  const hasError = Boolean(errors[field]);

  return {
    id: getManagerPropertyFieldId(field),
    'aria-invalid': hasError,
    'aria-describedby': hasError ? getManagerPropertyErrorId(field) : undefined,
  };
}

export function getManagerPropertyFormStatusMessage({
  mode,
  currentStep,
  totalSteps,
  currentStepTitle,
  errorCount,
  incompleteRequiredCount = 0,
  saving,
  submissionBlocker,
}: ManagerPropertyFormStatusInput): string {
  const action = mode === 'edit' ? 'edit property' : 'create property';
  const stepMessage = `Step ${currentStep} of ${totalSteps}: ${currentStepTitle}.`;

  if (saving) {
    return `Saving ${action} form. ${stepMessage}`;
  }

  const errorMessage =
    errorCount > 0
      ? `${errorCount} ${errorCount === 1 ? 'field needs' : 'fields need'} attention.`
      : incompleteRequiredCount > 0
        ? `${incompleteRequiredCount} required ${incompleteRequiredCount === 1 ? 'field is' : 'fields are'} still incomplete.`
        : 'All visible fields are valid.';

  const blockerMessage = submissionBlocker
    ? ` Submission blocked: ${submissionBlocker}`
    : '';

  return `${mode === 'edit' ? 'Edit' : 'Create'} property form step ${currentStep} of ${totalSteps}: ${currentStepTitle}. ${errorMessage}${blockerMessage}`;
}

export function getManagerPropertyUploadControlCopy(kind: ManagerPropertyUploadKind) {
  if (kind === 'videos') {
    return {
      buttonLabel: 'Click to upload videos',
      ariaLabel: 'Upload property videos',
      helpText: 'MP4, WebM, MOV up to 30MB each',
    };
  }

  return {
    buttonLabel: 'Click to upload images',
    ariaLabel: 'Upload property images',
    helpText: 'PNG, JPG, JPEG, WEBP up to 10MB each',
  };
}

export function getManagerPropertySubmitIntent({
  mode,
  currentStep,
  totalSteps,
}: {
  mode: ManagerPropertyFormMode;
  currentStep: number;
  totalSteps: number;
}): ManagerPropertySubmitIntent {
  if (mode === 'edit') {
    return 'save-property';
  }

  return currentStep < totalSteps ? 'advance-step' : 'save-property';
}

export function getManagerPropertyAddressRevalidationFields(): string[] {
  return [
    'country',
    'state',
    'city',
    'addressLine1',
    'postalCode',
    'latitude',
    'longitude',
  ];
}

export function getManagerPropertyDefaultAuditReason(mode: ManagerPropertyFormMode): string {
  return mode === 'edit'
    ? 'Manager updated property listing'
    : 'Manager created property listing';
}

export function getManagerPropertyAuditSummary({
  mode,
  status,
  currentStepTitle,
  actorName,
  reason,
}: ManagerPropertyAuditSummaryInput): string {
  const resolvedActor = actorName.trim() || 'Current manager';
  const action = mode === 'edit' ? `Update ${currentStepTitle}` : `Create ${currentStepTitle}`;
  const rawReason = reason.trim() || getManagerPropertyDefaultAuditReason(mode);
  const resolvedReason = /[.!?]$/.test(rawReason) ? rawReason : `${rawReason}.`;

  return `Audit trail preview. Actor: ${resolvedActor}. Action: ${action}. Status: ${status}. Reason: ${resolvedReason}`;
}
