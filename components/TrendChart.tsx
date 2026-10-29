"use client";

import { useMemo, useRef, useState } from "react";
import { Table2, LineChart } from "lucide-react";
import { shortDate, weekday } from "@/lib/format";

export interface Series {
  key: string;
  label: string;
  color: string;
  values: number[];
}

interface Props {
  days: string[];
  series: Series[];
  markers: { day: string; label: string }[];
  format: (n: number) => string;
  title: string;
}

const W = 720;
const H = 260;
const PL = 44;
const PR = 70;
const PT = 26;
const PB = 30;

function niceMax(v: number) {
  if (v <= 0) return 4;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * p;
}

export function TrendChart({ days, series, markers, format, title }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const ref = useRef<SVGSVGElement | null>(null);
  const shown = series.filter((s) => s.values.some((v) => v > 0));
  const max = niceMax(Math.max(1, ...shown.flatMap((s) => s.values)) * 1.1);
  const x = (i: number) => PL + (i / (days.length - 1)) * (W - PL - PR);
  const y = (v: number) => PT + (1 - v / max) * (H - PT - PB);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((k) => k * max);
  const paths = useMemo(
    () => shown.map((s) => ({ ...s, d: s.values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ") })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shown.map((s) => s.values.join(",")).join("|"), max],
  );
  // direct labels at the line ends, pushed apart when they would collide
  const ends = shown.map((s) => ({ key: s.key, label: s.label, y: y(s.values[s.values.length - 1]) }));
  if (ends.length === 2 && Math.abs(ends[0].y - ends[1].y) < 16) {
    const mid = (ends[0].y + ends[1].y) / 2;
    const up = ends[0].y <= ends[1].y ? 0 : 1;
    ends[up].y = mid - 8;
    ends[1 - up].y = mid + 8;
  }

  const onMove = (e: React.PointerEvent) => {
    const svg = ref.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - PL) / (W - PL - PR)) * (days.length - 1));
    setHover(Math.max(0, Math.min(days.length - 1, i)));
  };

  return (
    <div>
      <div className="card-head">
        <div className="chart-legend" aria-label="Legend">
          {shown.map((s) => (
            <span key={s.key}>
              <i style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
          {series.length > shown.length && <span className="muted">Chat has none of these</span>}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setTable((t) => !t)} aria-pressed={table}>
          {table ? <LineChart size={15} /> : <Table2 size={15} />}
          {table ? "Chart" : "Table"}
        </button>
      </div>
      {table ? (
        <div className="table-wrap">
          <table className="table" style={{ minWidth: 360 }}>
            <thead>
              <tr>
                <th>Day</th>
                {shown.map((s) => (
                  <th key={s.key}>{s.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((d, i) => (
                <tr key={d}>
                  <td>
                    {weekday(d).slice(0, 3)} {shortDate(d)}
                  </td>
                  {shown.map((s) => (
                    <td key={s.key} className="mono">
                      {format(s.values[i])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="chart-wrap">
          <svg ref={ref} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PL} x2={W - PR} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
                <text x={PL - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--muted)">
                  {format(t)}
                </text>
              </g>
            ))}
            {markers.map((m) => {
              const i = days.indexOf(m.day);
              if (i < 0) return null;
              return (
                <g key={m.day}>
                  <line x1={x(i)} x2={x(i)} y1={PT - 6} y2={H - PB} stroke="var(--ink-2)" strokeDasharray="3 4" strokeWidth={1} opacity={0.5} />
                  <text x={x(i) + 5} y={PT - 10} fontSize={11} fill="var(--ink-2)" fontWeight={600}>
                    {m.label}
                  </text>
                </g>
              );
            })}
            {days.map((d, i) =>
              i % 2 === 1 || i === days.length - 1 ? (
                <text key={d} x={x(i)} y={H - 10} textAnchor="middle" fontSize={11} fill="var(--muted)">
                  {shortDate(d)}
                </text>
              ) : null,
            )}
            {paths.map((p) => (
              <path key={p.key} d={p.d} fill="none" stroke={p.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            ))}
            {shown.map((s) => (
              <circle key={s.key} cx={x(s.values.length - 1)} cy={y(s.values[s.values.length - 1])} r={4.5} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
            ))}
            {ends.map((e) => (
              <text key={e.key} x={W - PR + 10} y={e.y + 4} fontSize={12} fill="var(--ink-2)" fontWeight={600}>
                {e.label}
              </text>
            ))}
            {hover !== null && (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={PT} y2={H - PB} stroke="var(--ink)" strokeWidth={1} opacity={0.35} />
                {shown.map((s) => (
                  <circle key={s.key} cx={x(hover)} cy={y(s.values[hover])} r={5} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
                ))}
              </g>
            )}
            <rect x={PL} y={PT} width={W - PL - PR} height={H - PT - PB} fill="transparent" />
          </svg>
          {hover !== null && (
            <div className="chart-tip" style={{ left: `${(x(hover) / W) * 100}%`, top: `${(Math.min(...shown.map((s) => y(s.values[hover]))) / H) * 100}%` }}>
              <b>
                {weekday(days[hover])}, {shortDate(days[hover])}
              </b>
              {shown.map((s) => (
                <div key={s.key}>
                  {s.label}: {format(s.values[hover])}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
