import * as React from "react";

const directionMap = {
  up: "rotate(180deg)",
  down: "rotate(0deg)",
  left: "rotate(-90deg)",
  right: "rotate(90deg)"
};

export const Caret = ({ color = "currentColor", size = 24, direction = "down", ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      transition: "transform .15s ease",
      transform: directionMap[direction],
      transformOrigin: "center"
    }}
    {...props}
  >
    <path d="M7 10l5 5 5-5" />
  </svg>
);
