import React, { useEffect, useRef, useState } from 'react';
import {
  BarChartOutlined,
  WalletOutlined,
  CalendarOutlined,
  FileTextOutlined,
  TeamOutlined,
  InboxOutlined,
} from '@ant-design/icons';

/** One bucket of sales value, used to draw the mini bar chart on the headline card. */
export interface MonthlyPoint {
  label: string;
  value: number;
}

export interface SalesSummaryProps {
  /** True while sales are still being fetched; renders the skeleton instead of the KPIs. */
  loading?: boolean;
  /** Full cash value of every item billed, across all invoices. */
  cashPrice: number;
  /** Combined monthly rental across all invoices. */
  rental: number;
  invoiceCount: number;
  itemCount: number;
  customerCount: number;
  /** Optional monthly series for the headline mini chart. Omit to hide the chart. */
  monthly?: MonthlyPoint[];
}

const formatAmount = (value: number) =>
  `Rs. ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const shouldAnimate = (animate: boolean) => animate && !prefersReducedMotion();

/**
 * Counts up to `target` on mount, and animates from the old figure to the new
 * one when `target` changes (an invoice added, edited or deleted).
 *
 * Two safeguards, because the real figure must never depend on a frame arriving:
 * the true value is rendered from the very first paint and the animation only
 * adjusts what is displayed afterwards, and a timeout settles on the exact value
 * in case requestAnimationFrame is throttled (background tabs) or unavailable.
 * Nothing is set synchronously inside the effect.
 */
const useCountUp = (target: number, animate: boolean) => {
  const [value, setValue] = useState(target);
  const previous = useRef<number | null>(null);

  useEffect(() => {
    if (!shouldAnimate(animate)) return;

    const from = previous.current === null ? 0 : previous.current;
    previous.current = target;
    if (from === target) return;

    const duration = 700;
    const start = performance.now();
    let frame = 0;
    let done = false;
    let frames = 0;

    const finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(frame);
      setValue(target);
    };

    const tick = (now: number) => {
      frames += 1;
      // Hold the correct value for the first frame, so the count-up reads as a
      // rise rather than the final number flashing back down to zero.
      if (frames === 1) {
        frame = requestAnimationFrame(tick);
        return;
      }
      const progress = Math.min(1, Math.max(0, (now - start) / duration));
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (target - from) * eased);
      if (progress >= 1) {
        done = true;
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    const settle = setTimeout(finish, duration + 150);

    return () => {
      done = true;
      cancelAnimationFrame(frame);
      clearTimeout(settle);
    };
  }, [target, animate]);

  return value;
};

interface CountUpValueProps {
  value: number;
  /** Decides how the interpolated number is rendered on each frame. */
  format: (value: number) => string;
  animate: boolean;
  className?: string;
}

const CountUpValue: React.FC<CountUpValueProps> = ({ value, format, animate, className }) => {
  const shown = useCountUp(value, animate);
  return <div className={className}>{format(shown)}</div>;
};

interface StatConfig {
  key: string;
  label: string;
  value: number;
  format: (value: number) => string;
  icon: React.ReactNode;
  /** Tinted background + foreground for the icon badge. */
  badge: string;
  /** Solid colour for the mini chart bars. */
  bar: string;
  /** Small pill under the value, used instead of a plain caption. */
  pill?: { text: string; className: string };
  caption?: string;
  /** Monthly series, only the headline card draws a chart. */
  monthly?: MonthlyPoint[];
}

const MiniBars: React.FC<{ points: MonthlyPoint[]; bar: string }> = ({ points, bar }) => {
  const max = Math.max(...points.map(p => p.value), 0);
  if (max <= 0) return null;

  return (
    <div className="mt-4">
      <div className="flex h-8 items-end gap-[3px]">
        {points.map(point => (
          <div
            key={point.label}
            title={`${point.label}: ${formatAmount(point.value)}`}
            className={`flex-1 rounded-t-[2px] ${bar} opacity-80`}
            style={{ height: `${Math.max(6, (point.value / max) * 100)}%` }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] font-medium text-slate-400">
        <span>{points[0].label}</span>
        <span>{points[points.length - 1].label}</span>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ stat: StatConfig; animate: boolean }> = ({ stat, animate }) => (
  <div className="group flex flex-col rounded-xl border border-slate-100 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-md">
    <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-lg ${stat.badge}`}>
      {stat.icon}
    </span>

    <div className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{stat.label}</div>

    <CountUpValue
      value={stat.value}
      format={stat.format}
      animate={animate}
      className="mt-1 text-3xl font-bold leading-tight text-slate-800 break-words"
    />

    {stat.pill ? (
      <span className={`mt-2 self-start rounded-full px-2 py-0.5 text-[11px] font-medium ${stat.pill.className}`}>
        {stat.pill.text}
      </span>
    ) : null}

    {stat.caption ? <div className="mt-2 text-[11px] text-slate-400">{stat.caption}</div> : null}

    {stat.monthly?.length ? <MiniBars points={stat.monthly} bar={stat.bar} /> : null}
  </div>
);

const SkeletonCards: React.FC = () => (
  <>
    {[0, 1, 2, 3].map(i => (
      <div key={i} className="rounded-xl border border-slate-100 bg-white p-4">
        <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-100" />
        <div className="mt-3 h-3 w-20 animate-pulse rounded bg-slate-100" />
        <div className="mt-2 h-7 w-24 animate-pulse rounded bg-slate-100" />
        <div className="mt-2 h-3 w-16 animate-pulse rounded bg-slate-100" />
      </div>
    ))}
  </>
);

export const SalesSummary: React.FC<SalesSummaryProps> = ({
  loading = false,
  cashPrice,
  rental,
  invoiceCount,
  itemCount,
  customerCount,
  monthly,
}) => {
  const isEmpty = !loading && invoiceCount === 0;

  const stats: StatConfig[] = [
    {
      key: 'cash',
      label: 'Total Sales Value',
      value: cashPrice,
      format: formatAmount,
      icon: <WalletOutlined />,
      badge: 'bg-blue-50 text-blue-600',
      bar: 'bg-blue-500',
      caption: 'Full cash value of every item billed',
      monthly,
    },
    {
      key: 'rental',
      label: 'Total Monthly Rental',
      value: rental,
      format: formatAmount,
      icon: <CalendarOutlined />,
      badge: 'bg-emerald-50 text-emerald-600',
      bar: 'bg-emerald-500',
      caption: 'Combined across all invoices',
    },
    {
      key: 'invoices',
      label: 'Total Invoices',
      value: invoiceCount,
      format: v => String(Math.round(v)),
      icon: <FileTextOutlined />,
      badge: 'bg-violet-50 text-violet-600',
      bar: 'bg-violet-500',
      pill: {
        text: `${itemCount} item${itemCount === 1 ? '' : 's'} sold`,
        className: 'bg-violet-50 text-violet-600',
      },
    },
    {
      key: 'customers',
      label: 'Total Customers',
      value: customerCount,
      format: v => String(Math.round(v)),
      icon: <TeamOutlined />,
      badge: 'bg-amber-50 text-amber-600',
      bar: 'bg-amber-500',
      pill: {
        text: 'Unique EPF numbers',
        className: 'bg-amber-50 text-amber-600',
      },
    },
  ];

  return (
    <section className="no-print rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <BarChartOutlined className="text-lg text-singer" />
        <h2 className="text-base font-semibold text-slate-800">Sales Summary</h2>
        <span className="text-xs text-slate-400">Overview of all invoices</span>
      </header>

      {loading ? (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SkeletonCards />
        </div>
      ) : isEmpty ? (
        <div className="mt-5 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 py-12 text-center">
          <InboxOutlined className="text-2xl text-slate-300" />
          <div className="text-sm font-semibold text-slate-600">No invoices yet</div>
          <div className="text-xs text-slate-400">
            Totals will appear here once your first invoice is created.
          </div>
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map(stat => (
              <StatCard key={stat.key} stat={stat} animate />
            ))}
          </div>

          <footer className="mt-5 flex flex-wrap gap-x-8 gap-y-1 border-t border-slate-100 pt-4 text-xs text-slate-500">
            <span>
              Avg. invoice value:{' '}
              <span className="font-semibold text-slate-700">{formatAmount(cashPrice / invoiceCount)}</span>
            </span>
            <span>
              Avg. monthly rental per invoice:{' '}
              <span className="font-semibold text-slate-700">{formatAmount(rental / invoiceCount)}</span>
            </span>
          </footer>
        </>
      )}
    </section>
  );
};

export default SalesSummary;
