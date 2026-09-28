// @ts-check
/** @param {unknown} value @returns {value is number} */
export const isPrice = (value) => typeof value === 'number' && Number.isFinite(value)
  && value >= 0.01 && value <= 1000000 && Math.abs(value * 100 - Math.round(value * 100)) < 0.000001;
/** @param {unknown} value @returns {value is number} */
export const isStock = (value) => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 1000000;
