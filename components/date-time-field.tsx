import type { ChangeEvent } from 'react';
import { useTheme } from '@/lib/theme';

export type DateTimeFieldMode = 'date' | 'time';

export type DateTimeFieldProps = {
  value: Date;
  mode: DateTimeFieldMode;
  onChange: (date: Date | null) => void;
};

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function toInputValue(value: Date, mode: DateTimeFieldProps['mode']) {
  if (mode === 'date') {
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function applyInputValue(current: Date, raw: string, mode: DateTimeFieldProps['mode']) {
  if (!raw) return null;
  const next = new Date(current);

  if (mode === 'date') {
    const [year, month, day] = raw.split('-').map(Number);
    if (![year, month, day].every(Number.isFinite)) return null;
    next.setFullYear(year, month - 1, day);
    next.setHours(12, 0, 0, 0);
    return next;
  }

  const [hours, minutes] = raw.split(':').map(Number);
  if (![hours, minutes].every(Number.isFinite)) return null;
  next.setHours(hours, minutes, 0, 0);
  return next;
}

export default function DateTimeField({ value, mode, onChange }: DateTimeFieldProps) {
  const { finish: c } = useTheme();
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(applyInputValue(value, event.target.value, mode));
  };

  return (
    <input
      aria-label={mode === 'date' ? 'Date' : 'Time'}
      type={mode}
      value={toInputValue(value, mode)}
      onChange={handleChange}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        border: `1px solid ${c.bd}`,
        borderRadius: 12,
        background: c.b1,
        color: c.ink,
        colorScheme: 'dark',
        padding: '10px 12px',
        font: 'inherit',
        outline: 'none',
      }}
    />
  );
}
