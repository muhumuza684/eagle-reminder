import DateTimePicker from '@react-native-community/datetimepicker';
import type { DateTimeFieldProps } from './date-time-field';

export default function DateTimeField({ value, mode, onChange }: DateTimeFieldProps) {
  return (
    <DateTimePicker
      value={value}
      mode={mode}
      display="default"
      onChange={(_event, date) => onChange(date ?? null)}
    />
  );
}
