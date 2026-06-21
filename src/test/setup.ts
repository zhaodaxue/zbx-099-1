import '@testing-library/jest-dom/vitest';

if (typeof (window as any).scrollTo !== 'function') {
  (window as any).scrollTo = () => {};
}
if (typeof (HTMLElement.prototype as any).scrollIntoView !== 'function') {
  (HTMLElement.prototype as any).scrollIntoView = function () {};
}
