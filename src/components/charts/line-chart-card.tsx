"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

export function LineChartCard({
  title,
  description,
  data,
  dataKey,
  categoryKey,
  color = "var(--color-chart-2)",
  className,
}: {
  title: string;
  description?: string;
  data: Record<string, string | number>[];
  dataKey: string;
  categoryKey: string;
  color?: string;
  className?: string;
}) {
  const config: ChartConfig = {
    [dataKey]: { label: title, color },
  };

  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <p className="font-semibold">{title}</p>
      {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      <ChartContainer config={config} className="mt-4 aspect-auto h-64 w-full">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey={categoryKey} tickLine={false} axisLine={false} fontSize={11} />
          <YAxis tickLine={false} axisLine={false} fontSize={11} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={`var(--color-${dataKey})`}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
