import React, { useState, useEffect } from 'react';
import { formatTimeAgo } from '../lib/formatTime';

export const LiveTime: React.FC<{ time: string, className?: string }> = ({ time, className }) => {
  const [display, setDisplay] = useState(() => formatTimeAgo(time));

  useEffect(() => {
    setDisplay(formatTimeAgo(time));
    const interval = setInterval(() => {
      setDisplay(formatTimeAgo(time));
    }, 10000);
    return () => clearInterval(interval);
  }, [time]);

  return <span className={className}>{display}</span>;
};
