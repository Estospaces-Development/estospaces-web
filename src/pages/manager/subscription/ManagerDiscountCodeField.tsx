import { useId, useState, type FormEvent } from 'react';
import { BadgePercent } from 'lucide-react';

import ActionSpinner from '@/components/ui/ActionSpinner';
import { describeDiscountPrice, type AppliedDiscount } from '@/lib/managerDiscountCode';

interface ManagerDiscountCodeFieldProps {
    planName: string;
    /** Pre-filled from a `?coupon=` link or the code this account used earlier. */
    initialCode: string;
    /** The discount applied to this plan, if any. */
    applied: AppliedDiscount | null;
    error: string | null;
    checking: boolean;
    disabled: boolean;
    onApply: (code: string) => void;
    onRemove: () => void;
}

export default function ManagerDiscountCodeField({ planName, initialCode, applied, error, checking, disabled, onApply, onRemove }: ManagerDiscountCodeFieldProps) {
    const [code, setCode] = useState(initialCode);
    const inputId = useId();
    const errorId = `${inputId}-error`;

    if (applied) {
        return <div role="status" className="mt-5 rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-900 dark:border-green-800 dark:bg-green-950/30 dark:text-green-100">
            <p className="flex items-center gap-2 font-bold"><BadgePercent className="h-4 w-4" aria-hidden /> Code {applied.code} applied to {planName}</p>
            <p className="mt-1 font-semibold">{describeDiscountPrice(applied.preview)}</p>
            <button type="button" disabled={disabled} onClick={onRemove} className="mt-3 min-h-11 rounded-lg border border-green-400 px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 disabled:opacity-50 dark:border-green-700">Remove code</button>
        </div>;
    }

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (code.trim()) onApply(code);
    };

    return <form onSubmit={submit} className="mt-5 rounded-xl border border-dashed border-gray-300 p-4 dark:border-gray-700" noValidate>
        <label htmlFor={inputId} className="text-sm font-semibold text-gray-800 dark:text-gray-100">Have a discount code?</label>
        <div className="mt-2 flex gap-2">
            <input
                id={inputId}
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                maxLength={32}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                className="min-h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 font-mono text-sm uppercase text-gray-900 focus-visible:outline-2 focus-visible:outline-orange-600 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
            />
            <button type="submit" disabled={disabled || checking || !code.trim()} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-orange-600 px-4 text-sm font-bold text-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:opacity-50 dark:text-orange-300">
                {checking ? <ActionSpinner size="sm" aria-hidden /> : null} Apply
            </button>
        </div>
        {error ? <p id={errorId} role="alert" className="mt-2 text-xs font-semibold text-red-700 dark:text-red-300">{error}</p> : null}
    </form>;
}
