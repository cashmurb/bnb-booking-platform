export type ResourceType =
  | "room_2br"
  | "room_studio"
  | "vehicle_car"
  | "vehicle_motorbike"
  | "vehicle_bicycle";

export type Resource = {
  id: string;
  type: ResourceType;
  label: string;
  is_active: boolean;
  nightly_rate_php: number | null;
  base_occupancy: number | null;
  max_occupancy: number | null;
  extra_guest_fee_php: number | null;
  cleaning_fee_php: number | null;
  overview: string | null;
  amenities: string[] | null;
};

export type DriverWindow = {
  id: number;
  label: string;
  start_time: string;
  end_time: string;
  price_php: number;
  sort_order: number;
  spans_midnight: boolean;
};

export type BookingStatus = "held" | "confirmed" | "expired" | "cancelled";

export type Booking = {
  id: string;
  status: BookingStatus;
  source: "manual" | "website";
  guest_name: string;
  guest_contact: string;
  notes: string | null;
  hold_expires_at: string | null;
  guest_count: number | null;
  calculated_total_php: number | null;
  final_total_php: number | null;
  created_at: string;
};

export type TaskType = "cleaning" | "driver";
export type TaskStatus = "pending" | "in_progress" | "done";

export type Task = {
  id: string;
  booking_id: string;
  type: TaskType;
  status: TaskStatus;
  guest_name: string;
  task_date: string;
  resource_label: string | null;
  driver_window_label: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
};

export type ResourceClaimInput = {
  resource_id: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD, exclusive (checkout day)
};

export type GuestHold = {
  id: string;
  status: string;
  calculatedTotalPhp: number;
  finalTotalPhp: number;
  holdExpiresAt: string | null;
};

export type SyncHoldInput = {
  guestName: string;
  guestContact: string;
  guestCount: number;
  room: { resourceId: string; startDate: string; endDate: string };
  driverSlots: { windowId: number; slotDate: string }[];
};

export type SyncHoldResult = {
  hold: GuestHold | null;
  error: string | null;
};

export type ConfirmResult = {
  success: boolean;
  bookingId: string | null;
  error: string | null;
};

export type UpdateHoldDetailsResult = {
  success: boolean;
  error: string | null;
};


export type DriverClaimInput = {
  window_id: number;
  slot_date: string; // YYYY-MM-DD
};
