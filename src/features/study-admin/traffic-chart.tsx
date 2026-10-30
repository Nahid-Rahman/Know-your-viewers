"use client";

import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatStudyTime } from "@/lib/study/time";

function hhmm(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
}

/**
 * Visits started and submissions saved per bucket, with stream start/end and
 * researcher annotations as reference lines. Purely descriptive: it does not
 * imply that an annotated event caused a change in traffic.
 */
export function TrafficChart({
  series,
  markers,
}: {
  series: { bucket: string; visits: number; submissions: number; canonical: number }[];
  markers: { at: string; label: string }[];
}) {
  if (!series.length) return <p className="text-sm text-muted-foreground">No visits recorded yet.</p>;
  const data = series.map((s) => ({ ...s, t: new Date(s.bucket).getTime() }));
  const min = data[0].t;
  const max = data[data.length - 1].t;
  return (
    <div className="h-72 w-full" role="img" aria-label="Visits and submissions over time">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="t" type="number" domain={[min, max]} tickFormatter={(t) => hhmm(new Date(t).toISOString())} stroke="var(--muted-foreground)" fontSize={11} />
          <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={11} width={32} />
          <Tooltip
            labelFormatter={(t) => formatStudyTime(new Date(Number(t)))}
            contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="visits" name="Visits started" stroke="var(--primary)" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="submissions" name="Submissions (all)" stroke="var(--accent-cyan)" dot={false} />
          <Line type="monotone" dataKey="canonical" name="Canonical submissions" stroke="var(--accent-green)" dot={false} />
          {markers
            .map((m) => ({ ...m, t: new Date(m.at).getTime() }))
            .filter((m) => m.t >= min && m.t <= max)
            .map((m, i) => (
              <ReferenceLine key={i} x={m.t} stroke="var(--accent-violet)" strokeDasharray="4 2" label={{ value: m.label, fontSize: 10, fill: "var(--muted-foreground)", position: "insideTopLeft" }} />
            ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
