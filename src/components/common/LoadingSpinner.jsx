// components/common/LoadingSpinner.jsx
import React from 'react';

const LoadingSpinner = ({ size = 'sm', text = '' }) => {
  const dimension =
    size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-6 w-6' : 'h-8 w-8';

  return (
    <div className="flex items-center justify-center p-4">
      <div
        className={`animate-spin rounded-full border-b-2 border-blue-600 ${dimension}`}
        aria-label="Cargando"
      />
      {text && <span className="ml-2 text-gray-600">{text}</span>}
    </div>
  );
};

export default LoadingSpinner;
