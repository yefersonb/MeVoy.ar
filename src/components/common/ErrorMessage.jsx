import React from 'react';

const ErrorMessage = ({ error, onRetry }) => (
  <div>
    <div>
      <div>{error}</div>
      {onRetry && (
        <button onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  </div>
);

export default ErrorMessage;