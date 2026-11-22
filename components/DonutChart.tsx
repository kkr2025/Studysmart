import React from 'react';

interface DonutChartProps {
  percentage: number;
  label?: string;
  sublabel?: string;
  size?: number;
  strokeWidth?: number;
  primaryColor?: string;
  trackColor?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  percentage,
  label,
  sublabel,
  size = 140,
  strokeWidth = 14,
  primaryColor = '#059669', // Emerald / Forest Green
  trackColor = '#E2E8F0',
}) => {
  const safePercent = Math.min(100, Math.max(0, Math.round(percentage)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (safePercent / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeLinecap="round"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={primaryColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-black text-[#064E3B] tracking-tight">{safePercent}%</span>
          {label && <span className="text-[10px] font-bold uppercase text-[#059669] tracking-wider">{label}</span>}
        </div>
      </div>
      {sublabel && (
        <p className="mt-2 text-xs font-semibold text-[#64748B] text-center">{sublabel}</p>
      )}
    </div>
  );
};

export default DonutChart;
