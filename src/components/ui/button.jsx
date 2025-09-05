// src/components/ui/button.jsx
import React from "react";

export function Button({ children, onClick, disabled = false, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-2xl font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
        disabled
          ? "bg-gray-300 text-gray-600 cursor-not-allowed"
          : "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500"
      } ${className}`}
    >
      {children}
    </button>
  );
}
