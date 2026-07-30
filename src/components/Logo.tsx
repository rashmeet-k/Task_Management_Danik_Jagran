import React from 'react';

interface LogoProps {
  width?: string;
  height?: string;
}

export const Logo: React.FC<LogoProps> = ({ width = 'w-16', height = 'h-8' }) => {
  return (
    <img 
      src="/Logo2.png" 
      alt="Newsroom Logo" 
      className={`object-contain ${width} ${height} flex-shrink-0`}
      onError={(e) => {
        // Fallback styling if image is missing
        e.currentTarget.style.display = 'none';
      }}
    />
  );
};
