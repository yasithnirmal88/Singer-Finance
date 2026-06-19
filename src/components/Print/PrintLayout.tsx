import React from 'react';
import './PrintLayout.css';

interface SaleItem {
  modelNumber: string;
  itemName: string;
  cashPrice: number;
  rental: number;
  term: number;
}

interface PrintSaleData {
  invoiceNo: string;
  date: string;
  customerName: string;
  institution: string;
  epfNumber: string;
  contactNumber: string;
  items: SaleItem[];
  totalCashPrice: number;
  totalRental: number;
  term: number;
  interestRate: number;
}

interface PrintLayoutProps {
  saleData: PrintSaleData;
}

const formatCurrency = (value?: number) => {
  if (value === undefined || value === null) return '';
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const splitDate = (dateStr: string) => {
  const parts = dateStr.split('-');
  return {
    y1: parts[0]?.[0] || '', y2: parts[0]?.[1] || '',
    y3: parts[0]?.[2] || '', y4: parts[0]?.[3] || '',
    m1: parts[1]?.[0] || '', m2: parts[1]?.[1] || '',
    d1: parts[2]?.[0] || '', d2: parts[2]?.[1] || '',
  };
};

export const PrintLayout: React.FC<PrintLayoutProps> = ({ saleData }) => {
  if (!saleData) return null;

  const date = splitDate(saleData.date || '');
  const invNo = saleData.invoiceNo ? saleData.invoiceNo.replace('SF-', '') : '';

  const rows = Array.from({ length: 5 }, (_, i) => {
    const item = saleData.items?.[i];
    return {
      index: i + 1,
      itemName: item?.itemName || '',
      modelNumber: item?.modelNumber || '',
      cashPrice: item?.cashPrice ? formatCurrency(item.cashPrice) : '',
      rental: item?.rental ? formatCurrency(item.rental) : '',
      term: item?.term?.toString() || '',
    };
  });

  return (
    <div className="print-layout">
      <div className="a4-invoice">
        <div className="invoice-border">
          <div className="invoice-header">
            <div className="invoice-title">
              <h2>Financed by Singer Finance (Lanka) PLC</h2>
              <p>No. 498, R. A. De Mel Mawatha, Colombo 03.</p>
              <p>Tel : 0112 400 400</p>
            </div>
            <div className="invoice-number">
              <span className="no-label">N&ordm;</span>
              <span className="no-value">{invNo}</span>
            </div>
          </div>

          <div className="customer-info">
            <div className="info-row">
              <label>Institution</label>
              <span className="info-value">{saleData.institution || ''}</span>
              <span className="epf-label">EPF Number :</span>
              <span className="info-box">{saleData.epfNumber || ''}</span>
            </div>
            <div className="info-row">
              <label>Customer Name</label>
              <span className="info-value">{saleData.customerName || ''}</span>
              <span className="date-label">Date</span>
              <div className="date-box-group">
                <div className="date-seg"><span className="date-seg-label">DD</span><span className="date-seg-value">{date.d1}</span></div>
                <div className="date-seg"><span className="date-seg-label">DD</span><span className="date-seg-value">{date.d2}</span></div>
                <div className="date-seg"><span className="date-seg-label">MM</span><span className="date-seg-value">{date.m1}</span></div>
                <div className="date-seg"><span className="date-seg-label">MM</span><span className="date-seg-value">{date.m2}</span></div>
                <div className="date-seg"><span className="date-seg-label">YYYY</span><span className="date-seg-value">{date.y1}</span></div>
                <div className="date-seg"><span className="date-seg-label">YYYY</span><span className="date-seg-value">{date.y2}</span></div>
                <div className="date-seg"><span className="date-seg-label">YYYY</span><span className="date-seg-value">{date.y3}</span></div>
                <div className="date-seg"><span className="date-seg-label">YYYY</span><span className="date-seg-value">{date.y4}</span></div>
              </div>
            </div>
            <div className="info-row">
              <label>Contact Number</label>
              <span className="info-value">{saleData.contactNumber || ''}</span>
            </div>
          </div>

          <table className="items-table">
            <thead>
              <tr>
                <th className="col-num">#</th>
                <th className="col-item">ITEM</th>
                <th className="col-model">MODEL</th>
                <th className="col-cash-price">CASH PRICE<br /><span style={{ fontSize: 7, fontWeight: 'normal' }}>Rs</span></th>
                <th className="col-rental">RENTAL</th>
                <th className="col-term">TERM</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.index}>
                  <td className="col-num">{row.index}</td>
                  <td className="col-item">{row.itemName}</td>
                  <td className="col-model">{row.modelNumber}</td>
                  <td className="col-cash-price">{row.cashPrice}</td>
                  <td className="col-rental">{row.rental}</td>
                  <td className="col-term">{row.term}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="total-row">
            <span className="total-label">TOTAL</span>
            <div className="total-underline">
              {saleData.totalCashPrice ? formatCurrency(saleData.totalCashPrice) : '0.00'}
            </div>
            <div className="total-underline">
              {saleData.totalRental ? formatCurrency(saleData.totalRental) : '0.00'}
            </div>
          </div>

          <div className="summary-section">
            <div className="summary-left">
              <div className="summary-item">
                <label>Total Rental<br />(Monthly)</label>
                <span className="summary-box">
                  {saleData.totalRental ? formatCurrency(saleData.totalRental) : '0.00'}
                </span>
              </div>
              <div className="summary-item">
                <label>Term</label>
                <div className="term-group">
                  <span className="term-box">{saleData.term || '0'}</span>
                  <span className="term-unit">M</span>
                </div>
              </div>
              <div className="summary-item">
                <label>Interest Rate<br />(Nominal)</label>
                <div className="rate-group">
                  <span className="rate-box">
                    {saleData.interestRate ? (saleData.interestRate * 100).toFixed(3) : '0.000'}
                  </span>
                  <span className="rate-unit">%</span>
                </div>
              </div>
            </div>

            <div className="summary-right">
              <div className="sig-box">
                <span className="sig-box-title">Supplier Details</span>
                <div className="stamp-area">
                  <div>SINGER Showroom</div>
                  <div style={{ fontSize: 6.5, marginTop: 1 }}>No. 91, New Galle Road,</div>
                  <div style={{ fontSize: 6.5 }}>Moratuwa.</div>
                  <div style={{ fontSize: 6.5 }}>(Opposite NSB Bank)</div>
                  <div style={{ fontSize: 6, fontWeight: 'normal', marginTop: 1 }}>Tel: 0112-647856 / 0755-144000</div>
                </div>
                <div className="sig-line">Authorized Signature &amp; Stamp</div>
              </div>
              <div className="sig-box">
                <span className="sig-box-title">Singer Finance (Lanka) PLC</span>
                <div style={{ flex: 1 }}></div>
                <div className="sig-line">Authorized Signatory</div>
              </div>
            </div>
          </div>
        </div>

        <hr className="double-divider" />

        <div className="offer-letter-section">
          <h3>Offer Letter Group sale Facility</h3>

          <div className="offer-content">
            <div className="terms-grid">
              <span className="term-label">1. Facility Amount</span><span className="term-colon">:</span><span className="term-value">As mentioned in the Invoice</span>
              <span className="term-label">2. Rental</span><span className="term-colon">:</span><span className="term-value">As mentioned in the Invoice</span>
              <span className="term-label">3. Interest Rate</span><span className="term-colon">:</span><span className="term-value">As mentioned in the Invoice</span>
              <span className="term-label">4. Default Rate</span><span className="term-colon">:</span><span className="term-value">Not Applicable</span>
              <span className="term-label">5. Security Offered,</span><span className="term-colon" />
              <div className="security-list">
                (I) Items describe in the invoice<br />
                (ii) Personal guarantee of two employees in the institute
              </div>
              <span className="term-label">6. Due date</span><span className="term-colon">:</span><span className="term-value">Informing via SMS</span>
            </div>

            <h4 style={{ fontSize: 8.5, fontWeight: 'bold', textTransform: 'uppercase', margin: '4px 0 2px' }}>General Conditions</h4>
            <ol className="general-conditions">
              <li>We reserve the right to include/pass on any new taxes/levies imposed by the government by time to time.</li>
              <li>If the customer changes the current employment should be notified to the Singer Finance (Lanka) PLC.</li>
              <li>The company reserves the right to review facility at its sole discretion from time to time and discontinue or vary the terms and conditions relating thereto including but not limited to the interest in default.</li>
              <li>The facilities hereunder shall be available to you only on perfection of the security documents.</li>
              <li>In additional to the above stated terms and conditions, the facility contains herein shall be subject to all clauses, terms and condition stipulated in the agreement and other contractual documents already executed by you and any other documents which may be required to be executed by you in the future.</li>
              <li>All expenses, stamp duty, legal and other charges in this connection will be borne by you,</li>
              <li>Singer finance is not liable for the defects or title of the items described in the invoice and defects of the item or title of the ownership of the item will not affect the obligation to the repayment of the monthly instalments.</li>
            </ol>

            <div className="offer-footer">
              <p style={{ fontWeight: 600 }}>This offer is valid only for 07 days.</p>
              <p style={{ textAlign: 'justify' }}>
                Please return the attached copy of this letter duly signed thereby indicating your understanding and acceptance of the terms and condition under which this facility is granted and of the security which is stipulated herein.
              </p>

              <div className="signature-footer">
                <div className="left">
                  <p>We look forward to a manually beneficial relationship.</p>
                  <p style={{ marginTop: 10 }}>Your faithfully,</p>
                  <p style={{ fontWeight: 'bold', marginTop: 2 }}>Singer Finance (Lanka) PLC</p>
                </div>
                <div className="right">
                  <div className="line">Accepted the terms and conditions of the facility</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintLayout;
