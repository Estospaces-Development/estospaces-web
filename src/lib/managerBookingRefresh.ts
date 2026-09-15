export interface RefreshableBooking {
  id: string;
  status: string;
}

export const nextBookingRequestGeneration = (generation: number): number => generation + 1;

export const isCurrentBookingRequest = (requestGeneration: number, currentGeneration: number): boolean => (
  requestGeneration === currentGeneration
);

export const markBookingConfirmed = <T extends RefreshableBooking>(bookings: T[], bookingId: string): T[] => (
  bookings.map((booking) => (
    booking.id === bookingId ? { ...booking, status: 'confirmed' } : booking
  ))
);
