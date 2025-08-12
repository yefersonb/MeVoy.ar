// src/components/ActionButton.jsx
import React from 'react';

const base = {
  padding: '6px 14px',
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  border: '1px solid transparent',
  background: '#f1f5f9',
};

const variants = {
  primary: {
    background: 'var(--color-primary)',
    color: 'var(--color-on-primary)',
    border: '1px solid var(--color-primary)',
  },
  neutral: {
    background: 'var(--color-surface)',
    color: 'var(--color-on-surface)',
    border: '1px solid var(--color-surface)',
  },
  destructive: {
    background: 'var(--color-text-primary)',
    color: 'var(--color-danger)',
    border: '1px solid var(--color-danger)',
  },
  success: {
    background: 'var(--color-success)',
    color: 'var(--color-on-success)',
    border: '1px solid var(--color-success)',
  },
};

export default function ActionButton({
  children,
  variant = 'neutral',
  disabled = false,
  style = {},
  ...props
}) {
  const variantStyle = variants[variant] || variants.neutral;
  return (
    <button
      {...props}
      disabled={disabled}
      style={{
        ...base,
        ...variantStyle,
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
    >
      {children}
    </button>
  );
}
