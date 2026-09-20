import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { SalesTimeseriesPoint } from "../../types/api";

interface RevenueChartProps {
  points: SalesTimeseriesPoint[];
  bucket: "hour" | "day";
}

// Two adjacent slots off the dataviz skill's validated categorical palette
// (blue + aqua) -- not the app's own brand gold (#C9A24B). Gold already
// means "primary action" everywhere else in this UI (buttons, the active
// nav item); reusing it here would make a data line look like something
// clickable. Checked with the skill's validate_palette.js before use: this
// pair clears the CVD-separation and normal-vision floors in both light
// and dark surfaces. Light-mode aqua sits just under the 3:1 contrast
// floor against white, which the skill treats as a WARN, not a fail --
// covered by the legend and tooltip labels below always rendering in plain
// ink, never leaning on the line color alone to say which series is which.
const REVENUE_COLOR = "#2a78d6";
const PROFIT_COLOR = "#1baf7a";
const INK = "#0b0b0b";
const INK_SECONDARY = "#52514e";
const INK_MUTED = "#898781";
const GRIDLINE = "#e1e0d9";
const AXIS_LINE = "#c3c2b7";

function formatBucketLabel(iso: string, bucket: "hour" | "day"): string {
  const d = new Date(iso);
  if (bucket === "hour") {
    return d.toLocaleTimeString(undefined, { hour: "numeric" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatNaira(value: number): string {
  return `₦${value.toLocaleString()}`;
}

export function RevenueChart({ points, bucket }: RevenueChartProps) {
  const data = useMemo(
    () =>
      points.map((p) => ({
        label: formatBucketLabel(p.date, bucket),
        revenue: Number(p.revenue),
        profit: Number(p.profit),
      })),
    [points, bucket],
  );

  const hasAnySales = data.some((d) => d.revenue > 0 || d.profit > 0);

  if (points.length === 0 || !hasAnySales) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-[#1C1C1A]/40">
        Nothing sold in this period yet.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRIDLINE} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: INK_MUTED, fontSize: 12 }}
            axisLine={{ stroke: AXIS_LINE }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: INK_MUTED, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => formatNaira(v)}
            width={72}
          />
          {/* itemStyle/labelStyle pin the tooltip's text to ink tokens --
              Recharts colors these by series stroke by default, which is
              exactly the "text wears the series color" pattern the dataviz
              skill calls out. The little colored dot on hover still carries
              identity; the words next to it don't need to. */}
          <Tooltip
            formatter={(value: number) => formatNaira(value)}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid rgba(11,11,11,0.10)",
              fontSize: 13,
            }}
            labelStyle={{ color: INK, fontWeight: 500 }}
            itemStyle={{ color: INK }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            iconType="plainline"
            formatter={(value: string) => (
              <span style={{ color: INK_SECONDARY }}>{value}</span>
            )}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke={REVENUE_COLOR}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="profit"
            name="Profit"
            stroke={PROFIT_COLOR}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
