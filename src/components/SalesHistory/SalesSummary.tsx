import React, { useEffect, useRef, useState } from 'react';
import { Progress, Skeleton } from 'antd';
import {
  BarChartOutlined,
  DollarOutlined,
  CalendarOutlined,
  FileTextOutlined,
  TeamOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { TERM_OPTIONS } from '../../constants';
import { formatCount, formatMoney } from '../../utils/format';
import type { Sale } from '../../types';

export interface SalesSummaryProps {
  /** The rows the figures describe. The parent passes the filtered rows while a search is active. */
  sales: Sale[];
  /** Total rows in the collection, used to describe the filter in the caption. */
  totalCount: number;
  loading?: boolean;
  /** The active search text, shown in the caption when a filter is applied. */
  searchText?: string;
}

/** Sum of the line items, falling back to the stored total for itemless invoices. */
const cashValueOf = (sale: Sale) => {
  if (!sale.items || sale.items.length === 0) return Number(sale.totalCashPrice) || 0;
  return sale.items.reduce((sum, item) => sum + (Number(item.cashPrice) || 0), 0);
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Counts up to `target` on mount, and animates from the old figure to the new one
 * when `target` changes.
 *
 * Two safeguards, because the real figure must never depend on a frame arriving:
 * the true value renders from the first paint and the animation only adjusts what
 * is displayed afterwards, and a timeout settles on the exact value in case
 * requestAnimationFrame is throttled (background tabs) or unavailable. Nothing is
 * set synchronously inside the effect.
 */
const useCountUp = (target: number, animate: boolean) => {
  const [value, setValue] = useState(target);
  const previous = useRef<number | null>(null);

  useEffect(() => {
    if (!animate || prefersReducedMotion()) return;

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
  helper: string;
  /** Optional extra line shown under the value. */
  footer?: React.ReactNode;
}

const StatCard: React.FC<{ stat: StatConfig; animate: boolean }> = ({ stat, animate }) => (
  <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-md">
    <span
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-lg ${stat.badge}`}
      aria-hidden="true"
    >
      {stat.icon}
    </span>

    <div className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{stat.label}</div>

    <CountUpValue
      value={stat.value}
      format={stat.format}
      animate={animate}
      className="mt-1 text-3xl font-bold leading-tight text-slate-900 [font-variant-numeric:tabular-nums] break-words"
    />

    {stat.footer ? <div className="mt-1 text-xs text-slate-500">{stat.footer}</div> : null}

    <div className="mt-auto pt-2 text-[11px] text-slate-400">{stat.helper}</div>
  </div>
);

const SkeletonCards: React.FC = () => (
  <>
    {[0, 1, 2, 3].map(i => (
      <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
        <Skeleton active paragraph={{ rows: 0 }} avatar={{ shape: 'square', size: 40 }} />
        <Skeleton active paragraph={{ rows: 2 }} title={false} className="mt-3" />
      </div>
    ))}
  </>
);

export const SalesSummary: React.FC<SalesSummaryProps> = ({
  sales,
  totalCount,
  loading = false,
  searchText = '',
}) => {
  const isEmpty = !loading && sales.length === 0;

  const cashPrice = sales.reduce((sum, sale) => sum + cashValueOf(sale), 0);
  const rental = sales.reduce((sum, sale) => sum + (Number(sale.totalRentalMonthly) || 0), 0);
  const invoiceCount = sales.length;
  const itemCount = sales.reduce((sum, sale) => sum + (sale.items?.length ?? 0), 0);
  const customerCount = new Set(sales.map(s => s.epfNumber).filter(Boolean)).size;
  const averageInvoice = invoiceCount > 0 ? cashPrice / invoiceCount : 0;

  // Invoice count per term, so staff can see which plans the book is made of.
  const termCounts = TERM_OPTIONS.map(option => ({
    term: option.value,
    label: `${option.value} mo`,
    count: sales.filter(sale => Number(sale.overallTerm) === option.value).length,
  }));
  const maxTermCount = Math.max(...termCounts.map(t => t.count), 0);

  const stats: StatConfig[] = [
    {
      key: 'cash',
      label: 'Total Sales Value',
      value: cashPrice,
      format: formatMoney,
      icon: <DollarOutlined />,
      // Primary accent: the Singer brand red.
      badge: 'bg-red-50 text-singer',
      helper: 'Full cash value of every item billed',
      footer: (
        <>
          Avg. invoice value:{' '}
          <span className="font-semibold text-slate-700">{formatMoney(averageInvoice)}</span>
        </>
      ),
    },
    {
      key: 'rental',
      label: 'Total Monthly Rental',
      value: rental,
      format: formatMoney,
      icon: <CalendarOutlined />,
      badge: 'bg-emerald-50 text-emerald-600',
      helper: 'Combined across all invoices',
    },
    {
      key: 'invoices',
      label: 'Total Invoices',
      value: invoiceCount,
      format: formatCount,
      icon: <FileTextOutlined />,
      badge: 'bg-blue-50 text-blue-600',
      helper: `${formatCount(itemCount)} item${itemCount === 1 ? '' : 's'} sold`,
    },
    {
      key: 'customers',
      label: 'Total Customers',
      value: customerCount,
      format: formatCount,
      icon: <TeamOutlined />,
      badge: 'bg-amber-50 text-amber-600',
      helper: 'Unique EPF numbers',
    },
  ];

  const isFiltered = searchText.trim().length > 0;
  const caption = isFiltered
    ? `${formatCount(invoiceCount)} of ${formatCount(totalCount)} invoices match "${searchText.trim()}"`
    : `All ${formatCount(invoiceCount)} invoice${invoiceCount === 1 ? '' : 's'}`;

  return (
    <section
      className="no-print box-border rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      aria-label="Sales summary"
    >
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-2">
          <BarChartOutlined className="text-singer" aria-hidden="true" />
          <h2 className="m-0 text-base font-semibold text-slate-900">Sales summary</h2>
        </span>
        <span className="text-xs text-slate-400">{caption}</span>
      </header>

      {loading ? (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SkeletonCards />
        </div>
      ) : isEmpty ? (
        <div className="mt-5 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center">
          <InboxOutlined className="text-2xl text-slate-300" aria-hidden="true" />
          <div className="text-sm font-semibold text-slate-600">No invoices yet</div>
          <div className="text-xs text-slate-400">
            {isFiltered
              ? 'No invoices match the current search.'
              : 'Totals will appear here once the first invoice is created.'}
          </div>
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map(stat => (
              <StatCard key={stat.key} stat={stat} animate />
            ))}
          </div>

          {maxTermCount > 0 ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Term breakdown
              </div>
              <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 xl:grid-cols-4">
                {termCounts.map(entry => (
                  <div key={entry.term}>
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="font-medium text-slate-600">{entry.label}</span>
                      <span className="font-semibold text-slate-800 [font-variant-numeric:tabular-nums]">
                        {formatCount(entry.count)}
                      </span>
                    </div>
                    <Progress
                      percent={maxTermCount > 0 ? (entry.count / maxTermCount) * 100 : 0}
                      showInfo={false}
                      size="small"
                      strokeColor={entry.count > 0 ? '#d6073b' : '#cbd5e1'}
                      trailColor="#e2e8f0"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
};

export default SalesSummary;

