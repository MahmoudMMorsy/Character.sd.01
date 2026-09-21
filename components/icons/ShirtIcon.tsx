
import React from 'react';

export const ShirtIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m-2.828-7.072a2 2 0 010 2.828m-2.829-2.828a2 2 0 000 2.828m2.829-2.828a5 5 0 000 7.072m2.828-7.072a5 5 0 010 7.072M9 12l2 2 4-4m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    <path d="M9 17.614A8.96 8.96 0 0012 19c1.63 0 3.14-.436 4.4-1.222M5.6 15.19A8.96 8.96 0 0012 19c1.63 0 3.14-.436 4.4-1.222M18.4 8.81A8.96 8.96 0 0012 5c-1.63 0-3.14.436-4.4 1.222" />
  </svg>
);
