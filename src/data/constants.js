export const PACKS = [
  { id: 'A', credits: 1,  label: 'Starter', discount: 0,    badge: null,           features: ['1 × 45-min lesson', 'Google Meet link included', 'Lesson notes & homework', 'Progress tracking', 'Private file sharing with Neeliën'] },
  { id: 'B', credits: 8,  label: 'Value',   discount: 0.08, badge: 'Most popular', features: ['8 × 45-min lessons', 'Google Meet link included', 'Lesson notes & homework', 'Progress tracking', 'Private file sharing with Neeliën'] },
  { id: 'C', credits: 16, label: 'Growth',  discount: 0.17, badge: null,           features: ['16 × 45-min lessons', 'Google Meet link included', 'Lesson notes & homework', 'Progress tracking', 'Private file sharing with Neeliën'] },
  { id: 'D', credits: 28, label: 'Bloom',   discount: 0.25, badge: 'Best value',   features: ['28 × 45-min lessons', 'Google Meet link included', 'Lesson notes & homework', 'Progress tracking', 'Private file sharing with Neeliën'] },
];

export const SUBJECTS = ['Conversational English', 'IELTS Preparation', 'Business English', 'Grammar Focus'];
export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export function packPrice(credits, discount, rate = 12) {
  return Math.round(rate * credits * (1 - discount));
}
export function packPerCredit(discount, rate = 12) {
  return (rate * (1 - discount)).toFixed(2);
}
export function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

// Prices are shown in US dollars. Change here (and the `currency` setting in the database) to switch currency.
export const CURRENCY_SYMBOL = '$';
export const CURRENCY_CODE = 'usd';
export const formatMoney = (cents, decimals = 0) =>
  `${CURRENCY_SYMBOL}${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
