import React, { useEffect, useState } from 'react';

interface SpringCounterProps {
  target: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const SpringCounter: React.FC<SpringCounterProps> = ({
  target,
  prefix = '',
  suffix = '',
  className = '',
  style,
}) => {
  const [displayValue, setDisplayValue] = useState(target);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setDisplayValue(target);
      return;
    }

    let frameId = 0;
    const duration = 950;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.max(0, Math.min((now - start) / duration, 1));
      const rawSpring = 1 - Math.pow(2, -9 * progress) * Math.cos(progress * Math.PI * 2.5);
      const spring = Math.max(0, Math.min(rawSpring, 1.12));
      const val = Math.round(target * spring);
      setDisplayValue(progress >= 1 ? target : val);
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [target]);

  const formatted = displayValue >= 1000 ? displayValue.toLocaleString('vi-VN') : String(displayValue);

  return (
    <span className={`t-stat ${className}`} style={style}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};
