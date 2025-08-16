import * as React from "react";

export const License = ({ color = "currentColor", size = 24, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
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

