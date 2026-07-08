import { getFastTrackDisplayTitle } from './fastTrackDisplayTitle';

export const getUserJourneyPropertyDisplayTitle = (propertyTitle?: string | null) => {
  return getFastTrackDisplayTitle(propertyTitle, 'your selected home');
};

export const buildUserJourneyNowCopy = (propertyTitle: string | null | undefined, stageLabel: string) => (
  `${getUserJourneyPropertyDisplayTitle(propertyTitle)} is at ${stageLabel.toLowerCase()}.`
);

export const buildCompletedUserJourneyCopy = (propertyTitle: string | null | undefined) => (
  `${getUserJourneyPropertyDisplayTitle(propertyTitle)} has finished its guided journey.`
);
