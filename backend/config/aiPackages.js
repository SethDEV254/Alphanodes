// Default AI package definitions — rateMin/rateMax are daily % bounds.
// Admin panel can override rateMin/rateMax per package via Setting key 'aiPackageRates';
// everything else (name, amount limits, duration) stays fixed.
const AI_PACKAGES = [
  { _id: 'alpha-x', id: 0, name: 'Alpha X', rateMin: 0.5, rateMax: 1.0, minAmount: 0,    maxAmount: 100,   duration: 30, durationDays: 30 },
  { _id: 'core',    id: 1, name: 'Core',    rateMin: 1.0, rateMax: 1.5, minAmount: 100,  maxAmount: 1000,  duration: 60, durationDays: 60 },
  { _id: 'max',     id: 2, name: 'Max',     rateMin: 0.5, rateMax: 2.0, minAmount: 1000, maxAmount: 10000, duration: 90, durationDays: 90 },
];

module.exports = { AI_PACKAGES };
