// Client-visible shape of the events a browser may report (validated again
// on the server by clientEventSchema in events.ts).
import type { InvalidReasonCode, PublicRouteKey, TrackableField } from "./constants";

export type ClientEvent =
  | { type: "LANDING_VIEWED" }
  | { type: "REWARD_SECTION_VIEWED" }
  | { type: "SPIN_COMPLETED" }
  | { type: "FORM_OPENED" }
  | { type: "FORM_CLOSED" }
  | { type: "FIELD_INTERACTED"; element: TrackableField }
  | { type: "SUBMISSION_ATTEMPTED" }
  | { type: "SUBMISSION_VALIDATION_FAILED"; reasons: InvalidReasonCode[] }
  | { type: "ROUTE_VIEWED"; element: PublicRouteKey }
  | { type: "CONFIRMATION_VIEWED" };
