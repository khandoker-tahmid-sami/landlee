import { useId, useState } from "react";

interface MonthlyBarChartProps {
  data: { month: string; label: string; count: number }[];
  color: string;
}

const CHART_WIDTH = 600;
const CHART_HEIGHT = 200;
const PADDING_LEFT = 28;
const PADDING_BOTTOM = 28;
const PADDING_TOP = 16;

export function MonthlyBarChart({ data, color }: MonthlyBarChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const gradientId = useId();

  const max = Math.max(1, ...data.map((d) => d.count));
  const plotWidth = CHART_WIDTH - PADDING_LEFT;
  const plotHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const barSlot = plotWidth / data.length;
  const barWidth = Math.min(44, barSlot * 0.55);

  const gridLines = [0, 0.5, 1].map((t) => ({
    y: PADDING_TOP + plotHeight * (1 - t),
    value: Math.round(max * t),
  }));

  return (
    <div className="bar-chart-wrap">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="bar-chart"
        role="img"
        aria-label="Applications per month"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.55" />
          </linearGradient>
        </defs>

        {gridLines.map((g) => (
          <g key={g.value}>
            <line x1={PADDING_LEFT} x2={CHART_WIDTH} y1={g.y} y2={g.y} className="chart-gridline" />
            <text x={PADDING_LEFT - 8} y={g.y} textAnchor="end" dominantBaseline="middle" className="chart-axis-label">
              {g.value}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const barHeight = (d.count / max) * plotHeight;
          const x = PADDING_LEFT + i * barSlot + (barSlot - barWidth) / 2;
          const y = d.count > 0 ? PADDING_TOP + plotHeight - barHeight : PADDING_TOP + plotHeight - 2;
          const height = d.count > 0 ? Math.max(barHeight, 2) : 2;
          const isLast = i === data.length - 1;

          return (
            <g
              key={d.month}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
            >
              {/* Invisible hit area wider than the visible bar, for an easier hover target */}
              <rect x={PADDING_LEFT + i * barSlot} y={PADDING_TOP} width={barSlot} height={plotHeight} fill="transparent" />
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={height}
                rx={5}
                fill={`url(#${gradientId})`}
                opacity={hovered === i ? 1 : 0.9}
                className="chart-bar"
              />
              <text
                x={PADDING_LEFT + i * barSlot + barSlot / 2}
                y={CHART_HEIGHT - PADDING_BOTTOM + 18}
                textAnchor="middle"
                className={isLast ? "chart-axis-label chart-axis-label-current" : "chart-axis-label"}
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      {hovered !== null && (
        <div
          className="chart-tooltip"
          style={{ left: `${((PADDING_LEFT + hovered * barSlot + barSlot / 2) / CHART_WIDTH) * 100}%` }}
        >
          <strong>{data[hovered].count}</strong> application{data[hovered].count === 1 ? "" : "s"}
          <br />
          {data[hovered].label}
        </div>
      )}
    </div>
  );
}
