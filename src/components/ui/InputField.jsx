import React, { useState } from "react";

/*
 * InputField — dark-theme aware form field.
 * Props:
 *   label       string
 *   type        "text" | "date" | "number" | "select" | "textarea" (default "text")
 *   value       any
 *   onChange    (e) => void
 *   options     string[]  — for type="select"
 *   readOnly    bool
 *   disabled    bool
 *   placeholder string
 *   name        string    — id/for, derived from label if omitted
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
  const [focused, setFocused] = useState(false);
  const inputId = name || label?.replace(/\s+/g, "-").toLowerCase() || "field";

  const fieldClass = [
    "input-field",
    focused   ? "input-field--focused"  : "",
    readOnly  ? "input-field--readonly" : "",
    disabled  ? "input-field--disabled" : "",
  ].filter(Boolean).join(" ");

  const sharedProps = {
    id:        inputId,
    name:      inputId,
    disabled:  disabled || readOnly,
    tabIndex:  (disabled || readOnly) ? -1 : 0,
    onFocus:   () => setFocused(true),
    onBlur:    () => setFocused(false),
    "aria-label": label,
    ...rest,
  };

  let control;

  if (type === "select") {
    control = (
      <div className="input-field__select-wrap">
        <select
          {...sharedProps}
          value={value}
          onChange={onChange}
          className="input-field__control input-field__select"
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <span className="input-field__caret" aria-hidden="true">▾</span>
      </div>
    );
  } else if (type === "textarea") {
    control = (
      <textarea
        {...sharedProps}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        placeholder={placeholder}
        rows={3}
        className="input-field__control input-field__textarea"
      />
    );
  } else {
    control = (
      <input
        {...sharedProps}
        type={type}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        placeholder={placeholder}
        className="input-field__control"
      />
    );
  }

  return (
    <div className={fieldClass}>
      {label && (
        <label htmlFor={inputId} className="input-field__label">
          {label}
        </label>
      )}
      {control}
    </div>
  );
}
