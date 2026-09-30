import React, { useEffect, useRef, useState } from 'react';
import { Skeleton } from 'antd';
import {
  BarChartOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  CalendarOutlined,
  FileTextOutlined,
  TeamOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { TERM_OPTIONS } from '../../constants';
import { formatCount, formatMoney } from '../../utils/format';
import type { Sale } from '../../types';
import './SalesSummary.css';

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
  helper: string;
  /** Optional extra line shown under the value. */
  footer?: React.ReactNode;
}

const StatCard: React.FC<{ stat: StatConfig; animate: boolean }> = ({ stat, animate }) => (
  <article className="ss-card">
    <span className="ss-badge" aria-hidden="true">
      {stat.icon}
    </span>
    <span className="ss-label">{stat.label}</span>
    <CountUpValue value={stat.value} format={stat.format} animate={animate} className="ss-value" />
    {stat.footer ? <span className="ss-sub">{stat.footer}</span> : null}
    <span className={stat.footer ? 'ss-hint' : 'ss-sub'}>{stat.helper}</span>
  </article>
);

const SkeletonCards: React.FC = () => (
  <>
    {[0, 1, 2, 3].map(i => (
      <div key={i} className="ss-card">
        <Skeleton active paragraph={{ rows: 2 }} avatar={{ shape: 'square', size: 52 }} title={false} />
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
      label: 'Total sales value',
      value: cashPrice,
      format: formatMoney,
      icon: <DollarOutlined />,
      helper: 'Full cash value of every item billed',
      footer: (
        <>
          Avg. invoice value: <strong>{formatMoney(averageInvoice)}</strong>
        </>
      ),
    },
    {
      key: 'rental',
      label: 'Total monthly rental',
      value: rental,
      format: formatMoney,
      icon: <CalendarOutlined />,
      helper: 'Combined across all invoices',
    },
    {
      key: 'invoices',
      label: 'Total invoices',
      value: invoiceCount,
      format: formatCount,
      icon: <FileTextOutlined />,
      helper: `${formatCount(itemCount)} item${itemCount === 1 ? '' : 's'} sold`,
    },
    {
      key: 'customers',
      label: 'Total customers',
      value: customerCount,
      format: formatCount,
      icon: <TeamOutlined />,
      helper: 'Unique EPF numbers',
    },
  ];

  const isFiltered = searchText.trim().length > 0;
  const caption = isFiltered
    ? `${formatCount(invoiceCount)} of ${formatCount(totalCount)} invoices match "${searchText.trim()}"`
    : `All ${formatCount(invoiceCount)} invoice${invoiceCount === 1 ? '' : 's'}`;

  return (
    <section className="ss-root no-print" aria-label="Sales summary">
      <header className="ss-header">
        <span className="ss-header-icon" aria-hidden="true">
          <BarChartOutlined />
        </span>
        <h2 className="ss-title">Sales summary</h2>
        <span className="ss-chip">{caption}</span>
      </header>

      {loading ? (
        <div className="ss-grid">
          <SkeletonCards />
        </div>
      ) : isEmpty ? (
        <div className="ss-empty">
          <InboxOutlined className="ss-empty-icon" aria-hidden="true" />
          <div className="ss-empty-title">No invoices yet</div>
          <div className="ss-empty-text">
            {isFiltered
              ? 'No invoices match the current search.'
              : 'Totals will appear here once the first invoice is created.'}
          </div>
        </div>
      ) : (
        <>
          <div className="ss-grid">
            {stats.map(stat => (
              <StatCard key={stat.key} stat={stat} animate />
            ))}
          </div>

          <div className="ss-panel">
            <div className="ss-panel-head">
              <span className="ss-panel-icon" aria-hidden="true">
                <ClockCircleOutlined />
              </span>
              <div>
                <h3 className="ss-panel-title">Term breakdown</h3>
                <p className="ss-panel-sub">Invoices by rental term</p>
              </div>
            </div>
            {termCounts.map(entry => (
              <div key={entry.term} className="ss-term-row">
                <span className="ss-term-name">{entry.label}</span>
                <span className="ss-term-count">{formatCount(entry.count)}</span>
                <div className="ss-track">
                  <div
                    className="ss-fill"
                    style={{ width: `${maxTermCount > 0 ? (entry.count / maxTermCount) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default SalesSummary;