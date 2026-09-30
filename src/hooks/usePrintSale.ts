import { useCallback, useState } from 'react';
import type { Sale } from '../types';
import type { PrintSaleData } from '../components/Print/PrintLayout';

/**
 * Shape a stored Sale into what the invoice printer needs.
 *
 * This is deliberately separate from the Sale record: printing wants the
 * monthly rental as `totalRental` and the agreed term as `term`, and carries no
 * NIC, interest rate or author.
 */
export const toPrintSaleData = (sale: Sale): PrintSaleData => ({
  invoiceNo: sale.invoiceNo,
  date: sale.date,
  customerName: sale.customerName,
  institution: sale.institution,
  epfNumber: sale.epfNumber,
  contactNumber: sale.contactNumber,
  items: sale.items,
  totalCashPrice: sale.totalCashPrice,
  totalRental: sale.totalRentalMonthly,
  term: sale.overallTerm,
});

/**
 * Track the invoice waiting to be printed.
 *
 * The browser needs a moment for the off-screen <PrintLayout> to mount before
 * window.print() runs, so the real window is triggered on a delay. Keeping the
 * pending invoice here, away from the page, means any screen can print without
 * re-implementing the timing.
 */
export const usePrintSale = () => {
  const [printSaleData, setPrintSaleData] = useState<PrintSaleData | null>(null);

  const printSale = useCallback((sale: Sale) => {
    setPrintSaleData(toPrintSaleData(sale));
    setTimeout(() => {
      window.print();
    }, 500);
  }, []);

  return { printSaleData, printSale };
};