/**
 * Common currency utilities for the Cash Points app
 */

export const formatCurrency = (amount: number): string => {
  return `৳${amount.toLocaleString('en-IN')}`;
};

export const formatCurrencyCompact = (amount: number): string => {
  if (amount >= 1000000) {
    return `৳${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `৳${(amount / 1000).toFixed(1)}K`;
  }
  return formatCurrency(amount);
};

export const formatCurrencyWithDecimals = (amount: number, decimals: number = 2): string => {
  return `৳${amount.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}`;
};

export const parseCurrency = (currencyString: string): number => {
  return parseFloat(currencyString.replace(/[৳,\s]/g, '')) || 0;
};
