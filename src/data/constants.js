export const PACKS = [
  { id: 'A', credits: 1,  label: 'Starter', discount: 0,    badge: null,           features: ['1 × 45-min lesson', 'Flexible scheduling', '2hr reschedule policy'] },
  { id: 'B', credits: 8,  label: 'Value',   discount: 0.08, badge: 'Most popular', features: ['8 × 45-min lessons', 'Priority scheduling', 'Resource library access', 'Progress tracking'] },
  { id: 'C', credits: 16, label: 'Growth',  discount: 0.17, badge: null,           features: ['16 × 45-min lessons', 'Resource library access', 'Mock test sessions', 'WhatsApp support'] },
  { id: 'D', credits: 28, label: 'Bloom',   discount: 0.25, badge: 'Best value',   features: ['28 × 45-min lessons', 'Full monthly pace', 'Unlimited Q&A', 'Monthly progress report'] },
];

export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export const NEELIEN_RESOURCES = [
  { id: 1, icon: '📄', bg: '#FEE2E2', title: 'Grammar Reference Guide',   meta: 'PDF · Grammar · 2.4MB',    type: 'grammar' },
  { id: 2, icon: '📘', bg: 'rgba(212,96,138,.08)', title: 'IELTS Writing Samples', meta: 'PDF · IELTS · 1.8MB',      type: 'ielts' },
  { id: 3, icon: '📗', bg: '#F0FDF4', title: 'Vocabulary Units 1–8',       meta: 'PDF · Vocabulary · 890KB', type: 'vocabulary' },
  { id: 4, icon: '🔗', bg: '#FFFBEB', title: 'BBC Learning English',       meta: 'External link · Listening', type: 'listening' },
  { id: 5, icon: '📋', bg: '#FDF4FF', title: 'Phrasal Verbs Worksheet',    meta: 'PDF · Grammar · 540KB',    type: 'grammar' },
  { id: 6, icon: '📙', bg: '#FAE4EB', title: 'Academic Word List (AWL)',   meta: 'PDF · Vocabulary · 1.1MB', type: 'vocabulary' },
];

export const STUDENT_UPLOADS = [
  { id: 1, icon: '📝', title: 'My Essay Draft — City Description', meta: 'DOCX · Uploaded by me · 12 Jun' },
];

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
