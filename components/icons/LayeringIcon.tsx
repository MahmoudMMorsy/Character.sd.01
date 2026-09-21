import React from 'react';

export const LayeringIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-5.571 3-5.571-3z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.75l-9.75-5.25L12 11.25l9.75 5.25-9.75 5.25z" />
  </svg>
);
