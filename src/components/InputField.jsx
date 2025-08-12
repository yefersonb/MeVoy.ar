import React from "react";

/**
 * InputField reutilizable para formularios.
 * Props:
 * - label: texto del label
 * - type: "text", "date", "select", "textarea"
 * - value: valor actual
 * - onChange: función de cambio (e => ...)
 * - options: opciones para select (array de strings)
 * - readOnly / disabled: boolean
 * - placeholder: string
 * - name: id/for para accesibilidad
 */
export default function InputField({
  label,
  type = "text",
  value,
  onChange,
  options = [],
  readOnly = false,
  disabled = false,
  placeholder = "",
  name,
  ...rest
}) {
  const inputId = name || label.replace(/\s+/g, "-").toLowerCase();

  const baseStyle = {
    width: "100%",
    fontSize: "1rem",
    background: "transparent",
    color: "#222",
    border: !readOnly ? "1px solid #e2e8f0" : "none",
    outline: "none",
    borderRadius: 6,
    padding: "8px 10px",
    transition: "border 0.18s, box-shadow 0.18s",
    boxShadow: "none",
    minHeight: 38,
    cursor: !readOnly ? "text" : "default",
    marginBottom: 2,
  };

  const focusStyle = {
    border: "1.5px solid #2563eb",
    boxShadow: "0 0 0 1px #2563eb, 0 1px 4px #2563eb10",
  };

  const [isFocused, setIsFocused] = React.useState(false);

  let inputEl;
  if (type === "select") {
    inputEl = (
      <select
        id={inputId}
        name={inputId}
        value={value}
        onChange={onChange}
        style={{
          ...baseStyle,
          ...(isFocused ? focusStyle : {}),
          cursor: !readOnly ? "pointer" : "default",
        }}
        disabled={readOnly || disabled}
        aria-label={label}
        tabIndex={readOnly || disabled ? -1 : 0}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...rest}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  } else if (type === "textarea") {
    inputEl = (
      <textarea
        id={inputId}
        name={inputId}
        value={value}
        onChange={onChange}
        rows={3}
        style={{
          ...baseStyle,
          ...(isFocused ? focusStyle : {}),
          resize: "vertical",
        }}
        readOnly={readOnly}
        disabled={disabled}
        aria-label={label}
        tabIndex={readOnly || disabled ? -1 : 0}
        placeholder={placeholder}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...rest}
      />
    );
  } else {
    inputEl = (
      <input
        id={inputId}
        name={inputId}
        type={type}
        value={value}
        onChange={onChange}
        style={{
          ...baseStyle,
          ...(isFocused ? focusStyle : {}),
        }}
        readOnly={readOnly}
        disabled={disabled}
        aria-label={label}
        tabIndex={readOnly || disabled ? -1 : 0}
        placeholder={placeholder}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...rest}
      />
    );
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <label
        htmlFor={inputId}
        style={{
          fontSize: "0.85rem",
          color: "#64748b",
          fontWeight: 600,
          marginBottom: 5,
          display: "block",
        }}
      >
        {label}
      </label>
      {inputEl}
    </div>
  );
}