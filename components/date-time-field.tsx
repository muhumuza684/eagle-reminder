export type DateTimeFieldMode = 'date' | 'time';

export type DateTimeFieldProps = {
  value: Date;
  mode: DateTimeFieldMode;
  onChange: (date: Date | null) => void;
};

export default function DateTimeField(_props: DateTimeFieldProps) {
  return null;
}
