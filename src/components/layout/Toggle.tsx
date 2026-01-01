"use client";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export function Toggle({ checked, onChange, disabled = false, label }: ToggleProps) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className="peer sr-only"
      />
      {/* Track - uses accent color when checked */}
      <div className={`
        w-11 h-6 rounded-full transition-colors duration-200
        ${checked 
          ? 'bg-[rgb(var(--accent-primary))]' 
          : 'bg-gray-300 dark:bg-gray-600'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}>
        {/* Thumb/knob */}
        <div className={`
          absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white
          transition-transform duration-200
          ${checked ? 'translate-x-5' : ''}
          ${disabled ? 'opacity-50' : ''}
        `} />
      </div>
      {label && (
        <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">
          {label}
        </span>
      )}
    </label>
  );
}

interface ToggleRowProps {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled = false,
}: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-[rgb(var(--text-primary))]">
          {title}
        </span>
        <span className="text-sm text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-secondary))]">
          {description}
        </span>
      </div>
      <Toggle
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        aria-label={title}
      />
    </div>
  );
}