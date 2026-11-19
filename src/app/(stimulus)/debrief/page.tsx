import { redirect } from "next/navigation";

// The on-site debrief was retired: participants are debriefed by phone through
// the outreach flow (Researcher → Outreach → Debrief). Old links land on the homepage.
export default function DebriefPage(): never {
  redirect("/");
}
