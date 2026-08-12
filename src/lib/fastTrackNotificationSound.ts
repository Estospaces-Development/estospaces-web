import { NOTIFICATION_TYPES } from '@/services/notificationsService';

export interface FastTrackAlertTone {
    delaySeconds: number;
    durationSeconds: number;
    frequencyHz: number;
    gain: number;
    oscillatorType: OscillatorType;
}

export const FAST_TRACK_ALERT_TONES: readonly FastTrackAlertTone[] = [
    { delaySeconds: 0, durationSeconds: 0.22, frequencyHz: 880, gain: 0.28, oscillatorType: 'sine' },
    { delaySeconds: 0.12, durationSeconds: 0.24, frequencyHz: 1320, gain: 0.24, oscillatorType: 'triangle' },
    { delaySeconds: 0.28, durationSeconds: 0.34, frequencyHz: 1760, gain: 0.2, oscillatorType: 'sine' },
];

const FAST_TRACK_AUDIBLE_NOTIFICATION_TYPES = new Set<string>([
    NOTIFICATION_TYPES.PROPERTY_SELECTED,
    NOTIFICATION_TYPES.DOCUMENTS_REQUESTED,
    NOTIFICATION_TYPES.CASE_FILE_DOCUMENT_REQUESTED,
    NOTIFICATION_TYPES.CASE_FILE_DOCUMENT_UPLOADED,
    NOTIFICATION_TYPES.CASE_FILE_DOCUMENT_REVIEWED,
    NOTIFICATION_TYPES.CASE_FILE_DOCUMENT_REUPLOAD_REQUESTED,
    NOTIFICATION_TYPES.FAST_TRACK_STARTED,
    NOTIFICATION_TYPES.FAST_TRACK_UPDATED,
    NOTIFICATION_TYPES.FAST_TRACK_COMPLETED,
]);

export const shouldPlayFastTrackAlertSound = (notificationType: string) =>
    FAST_TRACK_AUDIBLE_NOTIFICATION_TYPES.has(notificationType);

type AudioContextConstructor = new () => AudioContext;

interface AudioWindow extends Window {
    webkitAudioContext?: AudioContextConstructor;
}

let sharedAudioContext: AudioContext | null = null;

const getAudioContext = () => {
    if (typeof window === 'undefined') {
        return null;
    }
    if (sharedAudioContext) {
        return sharedAudioContext;
    }

    const audioWindow = window as AudioWindow;
    const AudioContextClass = window.AudioContext || audioWindow.webkitAudioContext;
    if (!AudioContextClass) {
        return null;
    }

    try {
        sharedAudioContext = new AudioContextClass();
    } catch {
        return null;
    }
    return sharedAudioContext;
};

export const primeFastTrackAlertSound = () => {
    const context = getAudioContext();
    if (context?.state === 'suspended') {
        void context.resume().catch(() => undefined);
    }
};

const scheduleFastTrackAlert = (context: AudioContext) => {
    const startAt = context.currentTime + 0.02;
    FAST_TRACK_ALERT_TONES.forEach((tone) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const toneStart = startAt + tone.delaySeconds;
        const toneEnd = toneStart + tone.durationSeconds;

        oscillator.type = tone.oscillatorType;
        oscillator.frequency.setValueAtTime(tone.frequencyHz, toneStart);
        gain.gain.setValueAtTime(0.0001, toneStart);
        gain.gain.exponentialRampToValueAtTime(tone.gain, toneStart + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, toneEnd);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(toneStart);
        oscillator.stop(toneEnd);
    });
};

export const playFastTrackAlertSound = () => {
    const context = getAudioContext();
    if (!context) {
        return;
    }

    if (context.state === 'suspended') {
        void context.resume()
            .then(() => scheduleFastTrackAlert(context))
            .catch(() => undefined);
        return;
    }

    scheduleFastTrackAlert(context);
};
