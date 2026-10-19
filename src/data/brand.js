// The one place the brand name and tagline live. The logo artwork (from the Figma brand file) lives in
// src/components/ui/logoPaths.js and is drawn by src/components/ui/Brand.jsx.
export const BRAND = {
  name: 'The Blooming Bilingual',
  short: 'Blooming Bilingual',
  tagline: 'Real English. Global Opportunities.',
  tutor: 'Neeliën Van Rooyen',
  site: 'www.thebloomingbilingual.com',
};

// Details printed on receipts. Fill these in and they appear on every receipt; anything left empty is simply left off.
// (Ask your accountant what must appear. In some countries a receipt needs a business address or VAT number.)
export const BUSINESS = {
  legalName: 'The Blooming Bilingual',   // the name receipts are issued in
  owner: 'Neeliën Van Rooyen',
  address: '',      // e.g. '12 Example Street, Pretoria, South Africa'
  email: '',        // e.g. 'hello@thebloomingbilingual.com' (only once you have a working address)
  vatNumber: '',    // leave empty if you are not VAT-registered
  registration: '', // company / tax registration number, if any
};
