"use client";

import { type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// ─── Button ──────────────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:   "bg-brand-orange hover:bg-brand-orange-dark text-white",
  secondary: "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700",
  danger:    "bg-red-500 hover:bg-red-600 text-white",
  ghost:     "hover:bg-slate-100 text-slate-600",
};

export function Button({
  variant = "primary",
  loading,
  fullWidth,
  children,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
        text-sm font-semibold transition-colors focus:outline-none focus:ring-2
        focus:ring-brand-orange/40 disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <input
        className={`
          w-full border rounded-lg px-3 py-2.5 text-sm text-slate-900
          placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-orange/30
          focus:border-brand-orange transition-colors bg-white
          ${error ? "border-red-400" : "border-slate-200"}
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── Textarea ─────────────────────────────────────────────────────────────────

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = "", ...props }: TextareaProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-slate-700">{label}</label>
      )}
      <textarea
        className={`
          w-full border rounded-lg px-3 py-2.5 text-sm text-slate-900
          placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-orange/30
          focus:border-brand-orange transition-colors bg-white resize-y min-h-[80px]
          ${error ? "border-red-400" : "border-slate-200"}
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className = "", ...props }: SelectProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-slate-700">{label}</label>
      )}
      <select
        className={`
          w-full border rounded-lg px-3 py-2.5 text-sm text-slate-900
          focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange
          transition-colors bg-white
          ${error ? "border-red-400" : "border-slate-200"}
          ${className}
        `}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── MultiSelect ──────────────────────────────────────────────────────────────

interface MultiSelectProps {
  label?: string;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
}

export function MultiSelect({ label, options, value, onChange }: MultiSelectProps) {
  function toggle(opt: string) {
    if (value.includes(opt)) {
      onChange(value.filter((v) => v !== opt));
    } else {
      onChange([...value, opt]);
    }
  }

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-slate-700">{label}</label>
      )}
      <div className="flex flex-wrap gap-2 p-2 border border-slate-200 rounded-lg bg-white min-h-[42px]">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
              value.includes(opt)
                ? "bg-brand-orange text-white border-brand-orange"
                : "bg-white text-slate-600 border-slate-300 hover:border-brand-orange"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}

export function Modal({ open, onClose, title, children, maxWidth = "max-w-lg" }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>
        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────

type BadgeVariant = "orange" | "green" | "red" | "blue" | "slate";

const badgeClasses: Record<BadgeVariant, string> = {
  orange: "bg-orange-100 text-orange-700",
  green:  "bg-green-100 text-green-700",
  red:    "bg-red-100 text-red-700",
  blue:   "bg-blue-100 text-blue-700",
  slate:  "bg-slate-100 text-slate-600",
};

export function Badge({ children, variant = "slate" }: { children: ReactNode; variant?: BadgeVariant }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeClasses[variant]}`}>
      {children}
    </span>
  );
}

// ─── Alert ────────────────────────────────────────────────────────────────────

export function Alert({ type, children }: { type: "error" | "success" | "warning" | "info"; children: ReactNode }) {
  const styles = {
    error:   "bg-red-50 border-red-200 text-red-700",
    success: "bg-green-50 border-green-200 text-green-700",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
    info:    "bg-blue-50 border-blue-200 text-blue-700",
  };
  return (
    <div className={`border rounded-lg p-3 text-sm ${styles[type]}`}>{children}</div>
  );
}

// ─── Page Header ─────────────────────────────────────────────────────────────

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-8 py-6 border-b border-slate-200 bg-white">
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}
