import React from 'react';

const ErrorMessage = ({ error, onRetry }) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
    <div className="flex items-center">
      <div className="text-red-800 text-sm">{error}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="ml-auto text-red-600 hover:text-red-800 text-sm font-medium"
        >
          Reintentar
        </button>
      )}
    </div>
  </div>
);

export default ErrorMessage;