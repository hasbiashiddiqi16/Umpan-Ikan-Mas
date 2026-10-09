import { ArrowUpRight, BarChart3, Eye, FileText, PieChart } from "lucide-react";

export type DailyAnalytic = { day: string; views: number };
export type TopPage = { path: string; views: number };

function shortDate(value: string, includeMonth = false) {
  const date = new Date(`${value}T12:00:00Z`);
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", ...(includeMonth ? { month: "short" } : {}) }).format(date);
}

export function TrafficLineChart({ data }: { data: DailyAnalytic[] }) {
  const width = 760;
  const height = 250;
  const padding = { left: 36, right: 14, top: 18, bottom: 34 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...data.map((point) => point.views), 1);
  const roundedMax = maxValue <= 5 ? 5 : Math.ceil(maxValue / 5) * 5;
  const points = data.map((point, index) => ({
    ...point,
    x: padding.left + (data.length > 1 ? (index / (data.length - 1)) * innerWidth : innerWidth / 2),
    y: padding.top + innerHeight - (point.views / roundedMax) * innerHeight,
  }));
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const baseline = height - padding.bottom;
  const area = points.length ? `${line} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z` : "";
  const ticks = [0, 1, 2, 3].map((index) => ({ value: Math.round((roundedMax * index) / 3), y: padding.top + innerHeight - (index / 3) * innerHeight }));
  const dateIndexes = [0, Math.floor((data.length - 1) / 3), Math.floor(((data.length - 1) * 2) / 3), data.length - 1].filter((value, index, arr) => value >= 0 && arr.indexOf(value) === index);
  const hasTraffic = data.some((point) => point.views > 0);
  return (
    <div>
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Grafik kunjungan 30 hari, total ${data.reduce((sum, item) => sum + item.views, 0)} tampilan`} className="h-[205px] w-full overflow-visible sm:h-[245px]">
          <defs><linearGradient id="traffic-area-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#5b8057" stopOpacity=".2" /><stop offset="100%" stopColor="#5b8057" stopOpacity="0" /></linearGradient></defs>
          {ticks.map((tick) => <g key={tick.value}><line x1={padding.left} x2={width - padding.right} y1={tick.y} y2={tick.y} stroke="#edf0eb" strokeDasharray="4 5" /><text x={padding.left - 9} y={tick.y + 4} textAnchor="end" fontSize="10" fill="#9ba39a">{tick.value}</text></g>)}
          {area && <path d={area} fill="url(#traffic-area-fill)" />}
          {line && <path d={line} fill="none" stroke="#4d744c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
          {points.filter((_, index) => index === points.length - 1 || index % 7 === 0).map((point) => <g key={point.day}><circle cx={point.x} cy={point.y} r="6" fill="#fff" stroke="#4d744c" strokeWidth="3"><title>{shortDate(point.day, true)}: {point.views} kunjungan</title></circle></g>)}
          {dateIndexes.map((index) => points[index] && <text key={points[index].day} x={points[index].x} y={height - 9} textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"} fontSize="10" fill="#98a096">{shortDate(points[index].day, true)}</text>)}
        </svg>
        {!hasTraffic && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><span className="rounded-full border border-[#e5eae2] bg-white/90 px-3 py-1.5 text-[10px] font-semibold text-[#899287] shadow-sm">Belum ada kunjungan tercatat</span></div>}
      </div>
      <div className="flex items-center justify-between border-t border-[#eef0ec] pt-3 text-[10px] text-[#899287]"><span>30 hari terakhir · UTC</span><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#5b8057]" />Kunjungan halaman</span></div>
    </div>
  );
}

export function TopPagesChart({ pages }: { pages: TopPage[] }) {
  const max = Math.max(...pages.map((page) => page.views), 1);
  return (
    <div className="space-y-4">
      {pages.length ? pages.map((page, index) => <div key={page.path}><div className="mb-1.5 flex items-center justify-between gap-3"><span className="truncate text-xs font-semibold text-[#536254]">{index === 0 && <span className="mr-1.5">🏅</span>}{page.path}</span><span className="shrink-0 text-xs font-bold tabular-nums text-[#526153]">{new Intl.NumberFormat("id-ID").format(page.views)}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#eef1eb]"><div className={`h-full rounded-full ${index === 0 ? "bg-[#416748]" : index === 1 ? "bg-[#698967]" : "bg-[#a0b398]"}`} style={{ width: `${Math.max(4, (page.views / max) * 100)}%` }} /></div></div>) : <div className="grid min-h-[160px] place-items-center rounded-xl border border-dashed border-[#e4e9e2] px-4 text-center text-xs leading-5 text-[#899287]">Halaman akan muncul setelah pengunjung membuka situs publik.</div>}
      <div className="flex items-center gap-2 border-t border-[#eef0ec] pt-3 text-[10px] text-[#899287]"><Eye size={13} /> Page view, 30 hari terakhir</div>
    </div>
  );
}

export function ContentDonutChart({ published, drafts, archived }: { published: number; drafts: number; archived: number }) {
  const segments = [{ label: "Tayang", value: published, color: "#426c49" }, { label: "Draft", value: drafts, color: "#c7a65c" }, { label: "Arsip", value: archived, color: "#a7b5a1" }];
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const radius = 49;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-around">
      <div className="relative h-[160px] w-[160px] shrink-0"><svg viewBox="0 0 160 160" role="img" aria-label={`Status konten: ${published} tayang, ${drafts} draft, ${archived} arsip`} className="h-full w-full -rotate-90"><circle cx="80" cy="80" r={radius} fill="none" stroke="#eff1ed" strokeWidth="18" />{total > 0 && segments.map((segment) => { const dash = (segment.value / total) * circumference; const offset = accumulated; accumulated += dash; return <circle key={segment.label} cx="80" cy="80" r={radius} fill="none" stroke={segment.color} strokeWidth="18" strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-offset}><title>{segment.label}: {segment.value}</title></circle>; })}</svg><div className="absolute inset-0 grid place-content-center text-center"><strong className="text-2xl font-black text-[#304234]">{total}</strong><span className="mt-0.5 text-[9px] font-bold uppercase tracking-[.12em] text-[#939a91]">Konten</span></div></div>
      <div className="grid w-full gap-3 sm:w-auto">{segments.map((segment) => <div key={segment.label} className="flex items-center justify-between gap-5 sm:justify-start"><span className="inline-flex items-center gap-2 text-xs font-semibold text-[#687468]"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />{segment.label}</span><strong className="text-sm font-extrabold tabular-nums text-[#364638]">{segment.value}</strong></div>)}</div>
    </div>
  );
}

export function ChartHeading({ icon: Icon, label, note }: { icon: typeof BarChart3; label: string; note?: string }) {
  return <div className="mb-5 flex items-start justify-between gap-3"><div><span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.13em] text-[#8b9488]"><Icon size={14} />{label}</span>{note && <p className="mt-1.5 text-[11px] leading-5 text-[#90988e]">{note}</p>}</div><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#f4f6f2] text-[#70806f]">{Icon === BarChart3 ? <BarChart3 size={15} /> : Icon === FileText ? <FileText size={15} /> : Icon === PieChart ? <PieChart size={15} /> : <ArrowUpRight size={15} />}</span></div>;
}
