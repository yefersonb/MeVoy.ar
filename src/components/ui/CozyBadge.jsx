import React from 'react';

const ArcProgressBar = ({ percentage = 0, color = 'rgba(255, 0, 55, 1)' }) => {
    const radius = 50;
    const strokeWidth = 5;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div style={{ width: '100%', height: '100%' }}>
            <svg
                viewBox="0 0 120 120"
                width="100%"
                height="100%"
                preserveAspectRatio="xMidYMid meet"
                style={{ transform: 'rotate(90deg)' }}
            >
                <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    stroke="#eee1"
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    fill="none"
                    strokeLinecap="round"
                />
            </svg>
        </div>
    );
};

export default ArcProgressBar;
