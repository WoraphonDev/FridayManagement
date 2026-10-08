import { useCountUp } from '../motion';
/** AN-10 animated number; assistive tech always reads the final value. */
export function Count({ value, suffix = '' }: { value: number; suffix?: string }) {
  const shown = useCountUp(value);
  return (
    <span aria-label={`${value}${suffix}`}>
      <span aria-hidden="true">
        {shown}
        {suffix}
      </span>
    </span>
  );
}
