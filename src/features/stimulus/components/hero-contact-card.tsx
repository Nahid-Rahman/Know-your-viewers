"use client";

import { useSyncExternalStore } from "react";
import { loadMockEntry, subscribeMockEntry } from "@/features/stimulus/mock-entry-store";

const getServerSnapshot = () => null;

/**
 * Shows the just-submitted contact info near the hero orb, matching the
 * reference exactly: submitting does not navigate away, it updates this
 * card in place. Renders nothing until an entry exists in this session.
 */
export function HeroContactCard() {
  const entry = useSyncExternalStore(subscribeMockEntry, loadMockEntry, getServerSnapshot);

  if (!entry || !(entry.email || entry.phone)) return null;

  return (
    <div className="card-border absolute -bottom-4 left-1/2 w-64 -translate-x-1/2 rounded-xl p-4 text-left md:left-auto md:right-0 md:translate-x-0">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase">Contact for follow-up</p>
      {entry.email && (
        <p className="mt-1.5 text-xs">
          <span className="text-muted-foreground">Email </span>
          {entry.email}
        </p>
      )}
      {entry.phone && (
        <p className="mt-1 text-xs">
          <span className="text-muted-foreground">Phone </span>
          {entry.phone}
        </p>
      )}
      {entry.streamNickname && (
        <p className="mt-1 text-xs">
          <span className="text-muted-foreground">Nickname </span>
          {entry.streamNickname}
        </p>
      )}
    </div>
  );
}
