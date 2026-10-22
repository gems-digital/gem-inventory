import type { ReactNode } from 'react';
import type { Option } from '../lib/attributes';
import './FormFields.css';

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  inputMode?: 'text' | 'numeric' | 'decimal';
  multiline?: boolean;
  suffix?: ReactNode;
}

export function TextField({
  label,
  value,
  onChange,
  error,
  placeholder,
  inputMode = 'text',
  multiline = false,
  suffix,
}: TextFieldProps) {
  return (
    <label className="ff">
      <span className="ff__label">{label}</span>
      <span className={`ff__box ${error ? 'ff__box--error' : ''}`}>
        {multiline ? (
          <textarea
            className="ff__input ff__input--area"
            value={value}
            placeholder={placeholder}
            rows={3}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <input
            className="ff__input"
            type="text"
            inputMode={inputMode}
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
        {suffix && <span className="ff__suffix">{suffix}</span>}
      </span>
      {error && <span className="ff__error">{error}</span>}
    </label>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  allowEmpty?: boolean;
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = '— Không chọn —',
  allowEmpty = true,
}: SelectFieldProps) {
  return (
    <label className="ff">
      <span className="ff__label">{label}</span>
      <span className="ff__box ff__box--select">
        <select className="ff__input ff__select" value={value} onChange={(e) => onChange(e.target.value)}>
          {allowEmpty && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="ff__chevron" aria-hidden="true">
          ▾
        </span>
      </span>
    </label>
  );
}

interface SegmentedProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
}

export function Segmented({ value, onChange, options }: SegmentedProps) {
  return (
    <div className="segmented" role="group">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`segmented__btn ${value === o.value ? 'segmented__btn--on' : ''}`}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

interface ChipGroupProps {
  label: string;
  selected: string[];
  options: Option[];
  onToggle: (value: string) => void;
}

export function ChipGroup({ label, selected, options, onToggle }: ChipGroupProps) {
  return (
    <div className="ff">
      <span className="ff__label">{label}</span>
      <div className="chip-group">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`chip-toggle ${selected.includes(o.value) ? 'chip-toggle--on' : ''}`}
            aria-pressed={selected.includes(o.value)}
            onClick={() => onToggle(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
