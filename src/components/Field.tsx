"use client";
import { useId } from "react";

type BaseProps = {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
};

function describedBy(errorId: string | undefined, hintId: string | undefined) {
  return [errorId, hintId].filter(Boolean).join(" ") || undefined;
}

/** Accessible text input with associated label, hint and error. */
export function Field({
  label,
  error,
  hint,
  required,
  className = "",
  ...props
}: BaseProps & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {required && <span className="text-red-500" aria-hidden="true"> *</span>}
      </label>
      <input
        id={id}
        className={`input ${error ? "input-error" : ""}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(errorId, hintId)}
        aria-required={required || undefined}
        {...props}
      />
      {hint && <p id={hintId} className="field-hint">{hint}</p>}
      {error && <p id={errorId} className="field-error">{error}</p>}
    </div>
  );
}

/** Accessible textarea with associated label, hint and error. */
export function TextareaField({
  label,
  error,
  hint,
  required,
  className = "",
  ...props
}: BaseProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {required && <span className="text-red-500" aria-hidden="true"> *</span>}
      </label>
      <textarea
        id={id}
        className={`input ${error ? "input-error" : ""}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(errorId, hintId)}
        aria-required={required || undefined}
        {...props}
      />
      {hint && <p id={hintId} className="field-hint">{hint}</p>}
      {error && <p id={errorId} className="field-error">{error}</p>}
    </div>
  );
}

/** Accessible select with associated label, hint and error. */
export function SelectField({
  label,
  error,
  hint,
  required,
  className = "",
  children,
  ...props
}: BaseProps & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {required && <span className="text-red-500" aria-hidden="true"> *</span>}
      </label>
      <select
        id={id}
        className={`input ${error ? "input-error" : ""}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(errorId, hintId)}
        aria-required={required || undefined}
        {...props}
      >
        {children}
      </select>
      {hint && <p id={hintId} className="field-hint">{hint}</p>}
      {error && <p id={errorId} className="field-error">{error}</p>}
    </div>
  );
}
