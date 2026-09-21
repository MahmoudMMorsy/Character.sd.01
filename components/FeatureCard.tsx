
import React from 'react';

interface FeatureCardProps {
  children: React.ReactNode;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ children }) => {
  return (
    <div className="bg-gray-800 p-6 sm:p-8 rounded-xl shadow-lg border border-gray-700">
      {children}
    </div>
  );
};

export default FeatureCard;
