import React from 'react';
import './PrintLayout.css';

interface SaleItem {
  modelNumber: string;
  itemName: string;
  cashPrice: number;
  rental: number;
  term: number;
}

interface PrintLayoutProps {
  saleData: {
    invoiceNo: string;
    date: string;
    epfNumber: string;
    customerName: string;
    institution: string;
    contactNumber: string;
    items: SaleItem[];
    totalCashPrice: number;
    totalRental: number;
    term: number;
    interestRate: number;
  } | null;
}

export const PrintLayout: React.FC<PrintLayoutProps> = ({ saleData }) => {
  if (!saleData) return null;

  const blankRowsCount = Math.max(0, 5 - saleData.items.length);
  const displayRows = [...saleData.items, ...Array(blankRowsCount).fill(null)];

  return (
    <div className="print-only-container">
      <div className="document-frame">
        <div className="serial-number-block">
          <span className="serial-prefix">N&ordm;</span>
          <span className="serial-number">{saleData.invoiceNo || '19471'}</span>
        </div>

        <div className="doc-header">
          <div className="company-title">Financed by Singer Finance (Lanka) PLC</div>
          <div className="company-address">No. 498, R. A. De Mel Mawatha, Colombo 03. Tel : 0112 400 400</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginTop: '6px' }}>
          <div>
            <div className="field-row">
              <span style={{ width: '110px', whiteSpace: 'nowrap' }}>Institution</span>: 
              <span className="dotted-line">{saleData.institution}</span>
            </div>
            <div className="field-row">
              <span style={{ width: '110px', whiteSpace: 'nowrap' }}>Customer Name</span>:
              <span className="dotted-line">{saleData.customerName}</span>
            </div>
            <div className="field-row">
              <span style={{ width: '110px', whiteSpace: 'nowrap' }}>Contact Number</span>:
              <span className="dotted-line">{saleData.contactNumber}</span>
            </div>
          </div>

          <div>
            <div className="field-row">
              <span style={{ width: '90px', whiteSpace: 'nowrap' }}>EPF Number</span>:
              <span className="dotted-line" style={{ border: '1px solid #000', height: '18px', padding: '1px 4px' }}>
                {saleData.epfNumber}
              </span>
            </div>
            <div className="field-row" style={{ marginTop: '8px' }}>
              <span style={{ width: '90px', whiteSpace: 'nowrap' }}>Date</span>:
              <span className="dotted-line" style={{ textAlign: 'center' }}>
                {saleData.date ? new Date(saleData.date).toLocaleDateString('en-GB') : 'DD / MM / YYYY'}
              </span>
            </div>
          </div>
        </div>

        <table className="invoice-table">
          <thead>
            <tr>
              <th style={{ width: '5%' }}></th>
              <th style={{ width: '35%' }}>Item</th>
              <th style={{ width: '25%' }}>Model</th>
              <th style={{ width: '15%', padding: 0 }}>
                <div style={{ borderBottom: '1px solid #000', padding: '2px' }}>Cash Price</div>
                <div className="sub-header-cell">Rs.</div>
              </th>
              <th style={{ width: '10%' }}>Rental</th>
              <th style={{ width: '5%' }}>Term</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((item, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td style={{ textAlign: 'left', paddingLeft: '6px' }}>{item?.itemName || ''}</td>
                <td>{item?.modelNumber || ''}</td>
                <td style={{ textAlign: 'right', paddingRight: '6px' }}>
                  {item ? item.cashPrice.toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                </td>
                <td style={{ textAlign: 'right', paddingRight: '6px' }}>
                  {item ? item.rental.toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                </td>
                <td>{item ? item.term : ''}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={3} style={{ border: 'none', textAlign: 'right', paddingRight: '8px', fontWeight: 'bold', fontSize: '8pt' }}>TOTAL</td>
              <td style={{ textAlign: 'right', paddingRight: '6px', fontWeight: 'bold' }}>
                {saleData.totalCashPrice.toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td style={{ border: 'none' }}></td>
              <td style={{ border: 'none' }}></td>
            </tr>
          </tbody>
        </table>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 1fr', gap: '12px', marginTop: '12px', alignItems: 'start' }}>
          <div>
            <div className="field-row" style={{ marginBottom: '4px' }}>
              <span style={{ fontSize: '8pt', width: '75px' }}>Total Rental<br />(Monthly)</span>
              <span className="dotted-line" style={{ border: '1px solid #000', height: '18px', textAlign: 'center', lineHeight: '18px' }}>
                {saleData.totalRental.toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="field-row" style={{ marginBottom: '3px' }}>
              <span style={{ fontSize: '9pt', width: '75px' }}>Term</span>
              <span className="dotted-line" style={{ border: '1px solid #000', height: '16px', textAlign: 'center', lineHeight: '16px', position: 'relative' }}>
                {saleData.term} <span style={{ position: 'absolute', right: '3px', top: '0', fontSize: '7pt', borderLeft: '1px solid #000', paddingLeft: '3px' }}>M</span>
              </span>
            </div>
            <div className="field-row">
              <span style={{ fontSize: '8pt', width: '75px' }}>Interest Rate<br />(Nominal)</span>
              <span className="dotted-line" style={{ border: '1px solid #000', height: '16px', textAlign: 'center', lineHeight: '16px', position: 'relative' }}>
                {saleData.interestRate} <span style={{ position: 'absolute', right: '3px', top: '0', fontSize: '7pt', borderLeft: '1px solid #000', paddingLeft: '3px' }}>%</span>
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="stamp-box">
              <span className="stamp-supplier">Supplier Details</span>
              SINGER Showroom<br />
              No. 91, New Galle Road, Moratuwa.<br />
              (Opposite NSB Bank)<br />
              Tel: 0112-647856 / 0755-144000
            </div>
          </div>

          <div style={{ border: '1px solid #000', height: '85px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9pt', textAlign: 'center', padding: '4px' }}>
            Singer Finance (Lanka) PLC
          </div>
        </div>
      </div>

      <div className="document-frame">
        <div className="offer-letter-title">Offer Letter Group sale Facility</div>

        <div style={{ display: 'grid', gridTemplateColumns: '110px 6px 1fr', rowGap: '4px', fontSize: '8.5pt', marginBottom: '8px' }}>
          <div>1. Facility Amount</div><div>:</div><div style={{ fontStyle: 'italic', color: '#555' }}>As mentioned in the Invoice</div>
          <div>2. Rental</div><div>:</div><div style={{ fontStyle: 'italic', color: '#555' }}>As mentioned in the Invoice</div>
          <div>3. Interest Rate</div><div>:</div><div style={{ fontStyle: 'italic', color: '#555' }}>As mentioned in the Invoice</div>
          <div>4. Default Rate</div><div>:</div><div style={{ fontStyle: 'italic', color: '#555' }}>Not Applicable</div>
          <div style={{ fontWeight: 'bold', gridColumn: 'span 3' }}>5. Security Offered,</div>
          <div style={{ paddingLeft: '16px', gridColumn: 'span 3' }}>(i) Items describe in the invoice</div>
          <div style={{ paddingLeft: '16px', gridColumn: 'span 3' }}>(ii) Personal guarantee of two employees in the institute</div>
          <div>6. Due date</div><div>:</div><div style={{ fontWeight: 'bold' }}>Informing via SMS</div>
        </div>

        <div className="legal-section-title" style={{ marginTop: '10px' }}>General Conditions</div>
        <ol className="legal-list legal-text">
          <li>We reserve the right to include/pass on any new taxes/levies imposed by the government by time to time.</li>
          <li>If the customer changes the current employment should be notified to the Singer Finance (Lanka) PLC.</li>
          <li>The company reserves the right to review facility at its sole discretion from time to time and discontinue or vary the terms and conditions relating thereto including but not limited to the interest in default.</li>
          <li>The facilities hereunder shall be available to you only on perfection of the security documents.</li>
          <li>In addition to the above stated terms and conditions, the facility contains herein shall be subject to all clauses, terms and condition stipulated in the agreement and other contractual documents already executed by you and any other documents which may be required to be executed by you in the future.</li>
          <li>All expenses, stamp duty, legal and other charges in this connection will be borne by you.</li>
          <li>Singer finance is not liable for the defects or title of the items described in the invoice and defects of the item or title of the ownership of the item will not be affected to the repayment of the monthly instalments.</li>
        </ol>

        <div className="legal-text" style={{ marginTop: '8px', fontWeight: 'bold' }}>This offer is valid only for 07 days.</div>
        <div className="legal-text" style={{ marginTop: '4px' }}>Please return the attached copy of this letter duly signed thereby indicating your understanding and acceptance of the terms and condition under which this facility is granted and of the security which is stipulated herein.</div>
        <div className="legal-text" style={{ marginTop: '4px' }}>We look forward to a mutually beneficial relationship.</div>

        <div style={{ marginTop: '12px', fontSize: '9pt' }}>
          <div>Your faithfully,<br /><strong>Singer Finance (Lanka) PLC</strong></div>
          <div style={{ marginTop: '12px' }}>Accepted the terms and conditions of the facility</div>
          <div style={{ borderTop: '1px dashed #000', marginTop: '12px', width: '60%' }}></div>
          <div style={{ fontSize: '9pt', marginTop: '2px' }}>Signed by the customer</div>
        </div>
      </div>

      <div className="print-footer">
        Singer Showroom, No.&nbsp;91, New Galle Road, Moratuwa. Tel: 0112-647856 / 0755-144000
      </div>
    </div>
  );
};

export default PrintLayout;
