"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

export function BarChartCard({
  title,
  description,
  data,
  dataKey,
  categoryKey,
  color = "var(--color-chart-1)",
  className,
  horizontal = false,
}: {
  title: string;
  description?: string;
  data: Record<string, string | number>[];
  dataKey: string;
  categoryKey: string;
  color?: string;
  className?: string;
  horizontal?: boolean;
}) {
  const config: ChartConfig = {
    [dataKey]: { label: title, color },
  };

  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <p className="font-semibold">{title}</p>
      {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      <ChartContainer config={config} className="mt-4 aspect-auto h-64 w-full">
        <BarChart
          data={data}
          layout={horizontal ? "vertical" : "horizontal"}
          margin={{ left: horizontal ? 24 : 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          {horizontal ? (
            <>
              <YAxis dataKey={categoryKey} type="category" width={120} tickLine={false} axisLine={false} fontSize={11} />
              <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
            </>
          ) : (
            <>
              <XAxis dataKey={categoryKey} tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} />
            </>
          )}
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey={dataKey} fill={`var(--color-${dataKey})`} radius={6} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
