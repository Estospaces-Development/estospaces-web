interface ManagerRecurringConsentProps {
    text: string;
    checked: boolean;
    disabled: boolean;
    onChange: (checked: boolean) => void;
}

// The whole card is the label, and the box sits in a 44px hit area, so the
// consent is easy to tap on mobile while staying a native checkbox.
export default function ManagerRecurringConsent({ text, checked, disabled, onChange }: ManagerRecurringConsentProps) {
    return <label className={`mt-8 flex min-h-11 items-start gap-2 rounded-2xl border border-gray-200 bg-white p-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center">
            <input type="checkbox" disabled={disabled} checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-6 w-6 cursor-[inherit] rounded accent-orange-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600" />
        </span>
        <span className="py-2.5 leading-6">{text}</span>
    </label>;
}
