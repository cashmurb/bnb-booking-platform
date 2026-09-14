export type StayPhase = "upcoming" | "in-progress" | "completed";

export function getStayPhase(startDate: string, endDate: string): StayPhase {
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD", local calendar date
  if (today < startDate) return "upcoming";
  if (today <= endDate) return "in-progress";
  return "completed";
}

export const STAY_PHASE_LABELS: Record<StayPhase, string> = {
  upcoming: "Upcoming",
  "in-progress": "Currently Staying",
  completed: "Completed",
};

export const STAY_PHASE_STYLES: Record<StayPhase, string> = {
  upcoming: "bg-blue-50 text-blue-700",
  "in-progress": "bg-amber-50 text-amber-800",
  completed: "bg-stone-100 text-stone-600",
};
