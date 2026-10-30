// Client-visible shape of the events a browser may report (validated again
// on the server by clientEventSchema in events.ts).
import type { TrackableField } from "./constants";

export type ClientEvent =
  | { type: "LANDING_VIEWED" }
  | { type: "REWARD_SECTION_VIEWED" }
  | { type: "SPIN_COMPLETED" }
  | { type: "FORM_OPENED" }
  | { type: "FORM_CLOSED" }
  | { type: "FIELD_INTERACTED"; element: TrackableField }
  | { type: "SUBMISSION_ATTEMPTED" }
  | { type: "CONFIRMATION_VIEWED" };
