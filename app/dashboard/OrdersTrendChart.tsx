"use client";

import { useId, useState } from "react";

interface DayPoint {
  label: string; // short date label, e.g. "Jul 12"
  fullLabel: string; // e.g. "Tuesday, Jul 12"
  count: number;
}

const WIDTH = 600;
const HEIGHT = 180;
const PAD_LEFT = 32;
const PAD_RIGHT = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 24;

function niceMax(value: number): number {
  if (value <= 4) return 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const step = normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export function OrdersTrendChart({ data }: { data: DayPoint[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const gradientId = useId();

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const maxCount = niceMax(Math.max(...data.map((d) => d.count), 1));
  const stepX = data.length > 1 ? plotWidth / (data.length - 1) : 0;

  const xAt = (i: number) => PAD_LEFT + i * stepX;
  const yAt = (count: number) => PAD_TOP + plotHeight - (count / maxCount) * plotHeight;

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"}${xAt(i)},${yAt(d.count)}`).join(" ");
  const areaPath = `${linePath} L${xAt(data.length - 1)},${PAD_TOP + plotHeight} L${xAt(0)},${PAD_TOP + plotHeight} Z`;
  const yTicks = [0, maxCount / 2, maxCount];

  const lastIndex = data.length - 1;
  const activeIndex = hoverIndex ?? lastIndex;
  const active = data[activeIndex];

  function handleMove(e: React.MouseEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * plotWidth;
    const idx = Math.max(0, Math.min(data.length - 1, Math.round(x / stepX)));
    setHoverIndex(idx);
  }

  return (
    <div
      className="viz-root relative"
      style={
        {
          "--surface-1": "#fcfcfb",
          "--text-primary": "#0b0b0b",
          "--text-secondary": "#52514e",
          "--text-muted": "#898781",
          "--gridline": "#e1e0d9",
          "--series-1": "#7c3aed",
        } as React.CSSProperties
      }
    >
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height={HEIGHT} className="overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0} />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD_LEFT}
              x2={WIDTH - PAD_RIGHT}
              y1={yAt(tick)}
              y2={yAt(tick)}
              stroke="var(--gridline)"
              strokeWidth={1}
            />
            <text x={PAD_LEFT - 6} y={yAt(tick) + 3} textAnchor="end" fontSize={9} fill="var(--text-muted)">
              {Math.round(tick)}
            </text>
          </g>
        ))}

        {data.map((d, i) =>
          i % Math.ceil(data.length / 6) === 0 ? (
            <text
              key={d.label}
              x={xAt(i)}
              y={HEIGHT - 6}
              textAnchor="middle"
              fontSize={9}
              fill="var(--text-muted)"
            >
              {d.label}
            </text>
          ) : null
        )}

        <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
        <path d={linePath} fill="none" stroke="var(--series-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {hoverIndex !== null && (
          <line
            x1={xAt(hoverIndex)}
            x2={xAt(hoverIndex)}
            y1={PAD_TOP}
            y2={PAD_TOP + plotHeight}
            stroke="var(--text-muted)"
            strokeWidth={1}
          />
        )}

        <circle cx={xAt(activeIndex)} cy={yAt(active.count)} r={4} fill="var(--series-1)" stroke="var(--surface-1)" strokeWidth={2} />

        {hoverIndex === null && (
          <text x={xAt(lastIndex) - 4} y={yAt(active.count) - 8} textAnchor="end" fontSize={10} fill="var(--text-primary)" fontWeight={600}>
            {active.count}
          </text>
        )}

        <rect
          x={PAD_LEFT}
          y={PAD_TOP}
          width={plotWidth}
          height={plotHeight}
          fill="transparent"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIndex(null)}
        />
      </svg>

      {hoverIndex !== null && (
        <div
          className="absolute pointer-events-none rounded-md border px-2 py-1 text-xs shadow-sm"
          style={{
            left: `${(xAt(hoverIndex) / WIDTH) * 100}%`,
            top: 0,
            transform: "translate(-50%, -100%)",
            background: "var(--surface-1)",
            borderColor: "var(--gridline)",
            color: "var(--text-primary)",
          }}
        >
          <div className="font-semibold">{active.count} orders</div>
          <div style={{ color: "var(--text-secondary)" }}>{active.fullLabel}</div>
        </div>
      )}
    </div>
  );
}
