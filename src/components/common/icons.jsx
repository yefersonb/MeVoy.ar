import * as React from "react";

const caretDirections = {
    up:    "rotate(180deg)",
    down:  "rotate(0deg)",
    left:  "rotate(-90deg)",
    right: "rotate(90deg)",
};

export const Caret = ({ color = "currentColor", size = 24, direction = "down", ...props }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size} height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transition: "transform .15s ease", transform: caretDirections[direction], transformOrigin: "center" }}
        {...props}
    >
        <path d="M7 10l5 5 5-5" />
    </svg>
);

export const CarIcon = ({ color = "currentColor", size = 24, ...props }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size} height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <circle cx="7.5" cy="16.5" r="2.5" />
        <circle cx="16.5" cy="16.5" r="2.5" />
        <path d="M2 14h3l1.5-4.5a2 2 0 0 1 1.9-1.5h7.2a2 2 0 0 1 1.9 1.5L19 14h3v3a1 1 0 0 1-1 1h-1.5M14 16.5H10M5 16.5H2" />
    </svg>
);

export const License =({ color = "currentColor", size = 24, ...props }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size} height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <path d="M 14.85 6.13 L 3.52 6.13 L 3.02 6.20 L 2.57 6.44 L 2.21 6.79 L 1.98 7.25 L 1.90 7.75 L 1.90 17.02 L 1.98 17.52 L 2.21 17.98 L 2.57 18.33 L 3.02 18.57 L 3.52 18.65 L 19.48 18.65 L 19.98 18.57 L 20.43 18.33 L 20.79 17.98 L 21.02 17.52 L 21.10 17.02 L 21.10 13.37 M 9.55 15.13 L 4.52 15.13 M 5.85 9.63 L 4.52 9.63 M 10.55 10.02 L 14.04 14.80 L 21.83 4.02 M 7.85 12.13 L 4.52 12.13" />
    </svg>
);
