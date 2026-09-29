/**
 * Company identity used on screen and on the printed agreement.
 *
 * These strings appear on the invoice, in the header and on the login card, so
 * they are declared once. Changing the registered address or the telephone
 * number is a one-line edit here rather than a hunt through the print layout.
 */

/** Short brand name, used in the app chrome and the login card. */
export const BRAND_NAME = 'Singer Finance';

/** Registered company name, used on the printed agreement. */
export const COMPANY_LEGAL_NAME = 'Singer Finance (Lanka) PLC';

/** Registered address and telephone number printed on the agreement. */
export const COMPANY_ADDRESS_LINE = 'No. 498, R. A. De Mel Mawatha, Colombo 03. Tel : 0112 400 400';

/** Path to the logo served from public/. */
export const COMPANY_LOGO_SRC = '/Singer-Logo.png';

/** Document title shown in the browser tab. */
export const APP_TITLE = 'Singer Finance Group Sale Facility';

/**
 * Invoice number printed when a record somehow arrives without one, so the
 * agreement is never blank in that field.
 */
export const FALLBACK_INVOICE_NO = '19471';
