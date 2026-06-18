import React from 'react';
import type { Sale } from '../../types';

interface PrintLayoutProps {
  sale: Partial<Sale>;
}

export const PrintLayout: React.FC<PrintLayoutProps> = ({ sale }) => {
  if (!sale) return null;

  // Make sure we have 5 rows exactly
  const rows = Array.from({ length: 5 }, (_, index) => {
    const item = sale.items?.[index];
    return {
      index: index + 1,
      itemName: item?.itemName || '',
      modelNumber: item?.modelNumber || '',
      cashPrice: item?.cashPrice ? `Rs. ${item.cashPrice.toFixed(2)}` : '',
      rental: item?.rental ? `Rs. ${item.rental.toFixed(2)}` : '',
      term: item?.term ? `${item.term} M` : '',
    };
  });

  return (
    <div className="print-only hidden print:block text-black bg-white p-6 w-[210mm] min-h-[297mm] mx-auto text-sm font-serif">
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .print-only {
            display: block !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      
      {/* Upper Border: Invoice and Fields */}
      <div className="border-[1.5px] border-black p-4 mb-4 rounded-sm">
        <div className="relative text-center pb-2 mb-4 border-b border-gray-300">
          <div className="absolute right-0 top-0 text-red-600 font-bold text-lg font-mono">
            No. {sale.invoiceNo || 'DRAFT'}
          </div>
          <h2 className="text-xl font-bold uppercase tracking-wide">Financed by Singer Finance (Lanka) PLC</h2>
          <p className="text-xs italic font-sans mt-0.5">No. 498, R. A. De Mel Mawatha, Colombo 03.</p>
          <p className="text-xs font-sans">Tel: 0112 400 400</p>
        </div>

        <div className="grid grid-cols-2 gap-y-2 text-sm mb-4 font-sans font-medium">
          <div><span className="text-gray-600 font-normal">Institution:</span> {sale.institution || '......................................................'}</div>
          <div><span className="text-gray-600 font-normal">Date:</span> {sale.date || '........................'}</div>
          <div><span className="text-gray-600 font-normal">EPF Number:</span> {sale.epfNumber || '......................................................'}</div>
          <div><span className="text-gray-600 font-normal">Contact Number:</span> {sale.contactNumber || '........................'}</div>
          <div className="col-span-2"><span className="text-gray-600 font-normal">Customer Name:</span> {sale.customerName || '..........................................................................................'}</div>
        </div>

        {/* Item Rows Table */}
        <table className="w-full border-collapse border border-black text-center text-xs mb-4">
          <thead>
            <tr className="bg-gray-100 font-sans">
              <th className="border border-black p-1.5 w-8">#</th>
              <th className="border border-black p-1.5 text-left pl-3">ITEM</th>
              <th className="border border-black p-1.5">MODEL</th>
              <th className="border border-black p-1.5">CASH PRICE (Rs)</th>
              <th className="border border-black p-1.5">RENTAL</th>
              <th className="border border-black p-1.5 w-16">TERM</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.index} className="h-7">
                <td className="border border-black p-1">{row.index}</td>
                <td className="border border-black p-1 text-left pl-3 font-sans">{row.itemName}</td>
                <td className="border border-black p-1 font-sans font-semibold">{row.modelNumber}</td>
                <td className="border border-black p-1 font-sans">{row.cashPrice}</td>
                <td className="border border-black p-1 font-sans">{row.rental}</td>
                <td className="border border-black p-1 font-sans">{row.term}</td>
              </tr>
            ))}
            <tr className="h-8 font-bold font-sans">
              <td colSpan={3} className="border border-black p-1.5 text-right pr-4 bg-gray-50">TOTAL</td>
              <td className="border border-black p-1.5">
                {sale.totalCashPrice ? `Rs. ${sale.totalCashPrice.toFixed(2)}` : 'Rs. 0.00'}
              </td>
              <td className="border border-black p-1.5">
                {sale.totalRentalMonthly ? `Rs. ${sale.totalRentalMonthly.toFixed(2)}` : 'Rs. 0.00'}
              </td>
              <td className="border border-black p-1.5"></td>
            </tr>
          </tbody>
        </table>

        {/* Totals, boxes, and signatures */}
        <div className="flex justify-between items-start gap-4 mt-2">
          <div className="flex flex-col gap-2.5 min-w-[240px] font-sans">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700">Total Rental (Monthly):</span>
              <span className="border border-black px-3 py-0.5 min-w-[100px] text-center font-bold text-sm">
                {sale.totalRentalMonthly ? sale.totalRentalMonthly.toFixed(2) : '0.00'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700">Term:</span>
              <span className="border border-black px-3 py-0.5 min-w-[100px] text-center font-bold text-sm">
                {sale.overallTerm || '0'} Months
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700">Interest Rate (Nominal):</span>
              <span className="border border-black px-3 py-0.5 min-w-[100px] text-center font-bold text-sm">
                {sale.interestRate ? `${(sale.interestRate * 100).toFixed(3)}%` : '0.00%'}
              </span>
            </div>
          </div>

          <div className="flex-1 border border-black p-5 h-20 text-center text-xs text-gray-400 font-sans relative flex items-end justify-center rounded-sm">
            <span className="absolute top-1 left-2 text-[10px] text-gray-600 font-bold uppercase tracking-wider">Supplier Details</span>
            <div className="border-t border-dotted border-gray-500 w-11/12 mx-auto pb-1 text-black font-semibold">Authorized Signature & Stamp</div>
          </div>

          <div className="flex-1 border border-black p-5 h-20 text-center text-xs text-gray-400 font-sans relative flex items-end justify-center rounded-sm">
            <span className="absolute top-1 left-2 text-[10px] text-gray-600 font-bold uppercase tracking-wider">Singer Finance (Lanka) PLC</span>
            <div className="border-t border-dotted border-gray-500 w-11/12 mx-auto pb-1 text-black font-semibold">Authorized Signatory</div>
          </div>
        </div>
      </div>

      {/* Lower Border: Legal Text */}
      <div className="border-[1.5px] border-black p-4 rounded-sm text-[11px] leading-relaxed font-sans">
        <h3 className="text-center font-serif text-sm font-bold underline uppercase tracking-wide mb-3">Offer Letter Group Sale Facility</h3>
        
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mb-3">
          <div><span className="font-bold">1. Facility Amount:</span> As mentioned in the Invoice</div>
          <div><span className="font-bold">2. Rental:</span> As mentioned in the Invoice</div>
          <div><span className="font-bold">3. Interest Rate:</span> As mentioned in the Invoice</div>
          <div><span className="font-bold">4. Default Rate:</span> Not Applicable</div>
          <div className="col-span-2">
            <span className="font-bold">5. Security Offered:</span>
            <ul className="list-disc pl-5 mt-0.5 space-y-0.5">
              <li>Items described in the invoice</li>
              <li>Personal guarantee of two employees in the institute</li>
            </ul>
          </div>
          <div className="col-span-2"><span className="font-bold">6. Due date:</span> Informing via SMS</div>
        </div>

        <h4 className="font-bold underline text-xs uppercase mt-3 mb-1">General Conditions</h4>
        <ol className="list-decimal pl-5 space-y-1.5 text-justify">
          <li>We reserve the right to include/pass on any new taxes/levies imposed by the government from time to time.</li>
          <li>If the customer changes their current employment, it should be notified immediately to Singer Finance (Lanka) PLC.</li>
          <li>The company reserves the right to review the facility at its sole discretion from time to time and discontinue or vary the terms and conditions relating thereto including but not limited to the interest in default.</li>
          <li>The facilities hereunder shall be available to you only on perfection of the security documents.</li>
          <li>In addition to the above stated terms and conditions, the facility contained herein shall be subject to all clauses, terms and conditions stipulated in the agreement and other contractual documents already executed by you and any other documents which may be required to be executed by you in the future.</li>
          <li>All expenses, stamp duty, legal and other charges in this connection will be borne by you.</li>
          <li>Singer Finance is not liable for the defects or title of the items described in the invoice. Defects of the item or title of the ownership of the item will not affect the obligation for full repayment of the monthly instalments.</li>
        </ol>

        <div className="mt-4 pt-3 border-t border-gray-200 space-y-2 text-xs">
          <p>This offer is valid only for 07 days.</p>
          <p>Please return the attached copy of this letter duly signed thereby indicating your understanding and acceptance of the terms and conditions under which this facility is granted and of the security which is stipulated herein.</p>
          
          <div className="flex justify-between items-end pt-6">
            <div>
              <p>We look forward to a mutually beneficial relationship.</p>
              <p className="mt-4">Yours faithfully,</p>
              <p className="font-bold">Singer Finance (Lanka) PLC</p>
            </div>
            
            <div className="border-t border-black w-60 text-center pt-1 font-bold text-xs mt-8">
              Accepted the terms and conditions of the facility
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default PrintLayout;
