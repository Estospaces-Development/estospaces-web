import { useId, useState, type FormEvent } from 'react';
import { CheckCircle2, Gift } from 'lucide-react';

import ActionSpinner from '@/components/ui/ActionSpinner';
import { TRIAL_CODE_MAX_LENGTH } from '@/services/managerSubscriptionService';

export type TrialCodeFieldResult = { kind: 'success' | 'error'; message: string };

interface ManagerTrialCodeFieldProps {
    submitting: boolean;
    disabled: boolean;
    result: TrialCodeFieldResult | null;
    onRedeem: (code: string) => void;
}

// A trial code is separate from the percent-discount code at checkout: it
// starts a free trial now and never opens payment.
export default function ManagerTrialCodeField({ submitting, disabled, result, onRedeem }: ManagerTrialCodeFieldProps) {
    const [code, setCode] = useState('');
    const inputId = useId();
    const resultId = `${inputId}-result`;
    const redeemed = result?.kind === 'success';
    const error = result?.kind === 'error' ? result.message : null;

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (submitting || disabled) return;
        const value = code.trim().toUpperCase();
        if (value) onRedeem(value);
    };

    return <section aria-label="Trial code" className="mb-6 rounded-2xl border border-dashed border-gray-300 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        {redeemed ? null : <form onSubmit={submit} noValidate>
            <label htmlFor={inputId} className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100"><Gift className="h-4 w-4 text-orange-600" aria-hidden /> Have a trial code?</label>
            <div className="mt-2 flex max-w-md gap-2">
                <input
                    id={inputId}
                    name="trial-code"
                    value={code}
                    onChange={(event) => setCode(event.target.value.toUpperCase())}
                    maxLength={TRIAL_CODE_MAX_LENGTH}
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    readOnly={submitting}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={resultId}
                    className="min-h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 font-mono text-sm uppercase text-gray-900 focus-visible:outline-2 focus-visible:outline-orange-600 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
                <button type="submit" disabled={disabled || submitting || !code.trim()} aria-busy={submitting || undefined} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-orange-600 px-4 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:opacity-50">
                    {submitting ? <ActionSpinner size="sm" aria-hidden /> : null} Redeem
                </button>
            </div>
        </form>}
        <p id={resultId} role="status" aria-live="polite" className={result ? `${redeemed ? '' : 'mt-2 '}flex items-center gap-2 text-sm font-semibold ${redeemed ? 'text-green-800 dark:text-green-200' : 'text-red-700 dark:text-red-300'}` : 'sr-only'}>
            {redeemed ? <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden /> : null}{result?.message ?? ''}
        </p>
    </section>;
}
