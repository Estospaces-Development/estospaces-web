import { getFastTrackDisplayTitle } from './fastTrackDisplayTitle';

export const getUserJourneyPropertyDisplayTitle = (propertyTitle?: string | null) => {
  return getFastTrackDisplayTitle(propertyTitle, 'your selected home');
};

const getUserJourneyStageAction = (stageLabel: string) => {
  switch (stageLabel.trim().toLowerCase()) {
    case 'legal, exchange, and agreement':
      return 'complete legal checks, exchange, and agreement';
    case 'completion and keys':
      return 'complete the purchase and collect your keys';
    default:
      return stageLabel.trim().toLowerCase();
  }
};

export const buildUserJourneyNowCopy = (propertyTitle: string | null | undefined, stageLabel: string) => (
  `${getUserJourneyPropertyDisplayTitle(propertyTitle)}: ready to ${getUserJourneyStageAction(stageLabel)}.`
);

export const buildCompletedUserJourneyCopy = (propertyTitle: string | null | undefined) => (
  `${getUserJourneyPropertyDisplayTitle(propertyTitle)} has finished its guided journey.`
);
