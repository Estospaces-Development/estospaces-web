import { useId, useRef, useState, type FormEvent } from 'react';
import { Sparkles } from 'lucide-react';

import ActionSpinner from '@/components/ui/ActionSpinner';
import { PILOT_CODE_LENGTH, formatPilotDate, getPilotCodeInputError, normalizePilotCode, type PilotRedemptionAvailability } from '@/lib/managerPilotRedemption';

interface ManagerPilotRedemptionProps {
    availability: PilotRedemptionAvailability;
    /** Another page action or refresh is running. */
    disabled: boolean;
    redeeming: boolean;
    /** Resolves to a user-facing error message, or null once the server accepted the code. */
    onRedeem: (code: string) => Promise<string | null>;
    /** Only for deterministic tests; the browser uses the manager's local time zone. */
    timeZone?: string;
}

const sectionClass = 'mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900';

export default function ManagerPilotRedemption({ availability, disabled, redeeming, onRedeem, timeZone }: ManagerPilotRedemptionProps) {
    const baseId = useId();
    const headingId = `${baseId}-heading`;
    const inputId = `${baseId}-code`;
    const helpId = `${baseId}-help`;
    const errorId = `${baseId}-error`;
    const reasonId = `${baseId}-reason`;
    const [code, setCode] = useState('');
    const [message, setMessage] = useState<string | null>(null);
    const submitting = useRef(false);

    if (availability.kind === 'active') {
        const endsAt = formatPilotDate(availability.endsAt, timeZone);
        const startsAt = formatPilotDate(availability.startsAt, timeZone);
        return (
            <section aria-labelledby={headingId} className={sectionClass}>
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-orange-600"><Sparkles className="h-4 w-4" aria-hidden /> Pilot</p>
                <h2 id={headingId} className="mt-2 text-xl font-black text-gray-900 dark:text-white">Your pilot is active</h2>
                <p role="status" className="mt-2 text-sm text-gray-700 dark:text-gray-200">{endsAt ? <>Pilot access is active until <strong>{endsAt}</strong>.</> : 'Pilot access is active. Refresh to see its end date.'}</p>
                {availability.campaign || startsAt ? <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{availability.campaign ? `Campaign: ${availability.campaign}.` : ''}{availability.campaign && startsAt ? ' ' : ''}{startsAt ? `Started ${startsAt}.` : ''}</p> : null}
                <p className="mt-3 text-xs leading-5 text-gray-600 dark:text-gray-300">A paid plan can be chosen after the pilot ends. When it ends, your account returns to Free limits unless you have a paid plan.</p>
            </section>
        );
    }

    if (availability.kind === 'blocked') {
        return (
            <section aria-labelledby={headingId} className={sectionClass}>
                <h2 id={headingId} className="text-lg font-black text-gray-900 dark:text-white">Pilot code</h2>
                <p role="status" className="mt-2 text-sm text-gray-700 dark:text-gray-200">{availability.reason}</p>
            </section>
        );
    }

    const unavailableReason = availability.kind === 'unknown' ? availability.reason : null;
    const formDisabled = disabled || redeeming || unavailableReason !== null;

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (formDisabled || submitting.current) return;
        const inputError = getPilotCodeInputError(code);
        if (inputError) {
            setMessage(inputError);
            return;
        }
        submitting.current = true;
        setMessage(null);
        try {
            const error = await onRedeem(normalizePilotCode(code));
            setMessage(error);
            if (!error) setCode('');
        } finally {
            submitting.current = false;
        }
    };

    return (
        <section aria-labelledby={headingId} className={sectionClass}>
            <h2 id={headingId} className="text-lg font-black text-gray-900 dark:text-white">Have a pilot code?</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Pilot codes are issued by Estospaces to a single manager account. A pilot gives 60 days of unlimited published properties and Fast Track cases, with no payment.</p>
            {unavailableReason ? <p id={reasonId} role="status" className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">{unavailableReason}</p> : null}
            <form noValidate onSubmit={(event) => void submit(event)} aria-busy={redeeming} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="flex-1">
                    <label htmlFor={inputId} className="block text-sm font-semibold text-gray-800 dark:text-gray-100">Pilot code</label>
                    <input
                        id={inputId}
                        name="pilot_code"
                        type="text"
                        value={code}
                        onChange={(event) => { setCode(event.target.value); setMessage(null); }}
                        disabled={formDisabled}
                        autoComplete="off"
                        autoCapitalize="characters"
                        spellCheck={false}
                        maxLength={PILOT_CODE_LENGTH + 16}
                        placeholder="ESTO-PILOT-…"
                        aria-invalid={message ? true : undefined}
                        aria-describedby={[helpId, message ? errorId : null, unavailableReason ? reasonId : null].filter(Boolean).join(' ')}
                        className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-3 font-mono text-sm text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                    />
                    <p id={helpId} className="mt-1 text-xs text-gray-600 dark:text-gray-300">Enter the code exactly as it was sent to you. Spaces are ignored.</p>
                    {message ? <p id={errorId} role="alert" className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">{message}</p> : null}
                </div>
                <button type="submit" disabled={formDisabled} className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:cursor-not-allowed disabled:opacity-50 sm:mt-6">
                    {redeeming ? <><ActionSpinner size="sm" aria-hidden /> Starting pilot…</> : 'Redeem pilot code'}
                </button>
            </form>
        </section>
    );
}
