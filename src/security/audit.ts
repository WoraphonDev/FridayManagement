/** Redact recursively, including older rows read through the audit service. */
export function redactAudit(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactAudit);
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    const secretField =
      typeof v.field === 'string' &&
      /password|secret|token|cookie|csrf|authorization/i.test(v.field);

    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        (secretField && ['before', 'after'].includes(key)) ||
        (/password|passwd|secret|token|cookie|csrf|authorization|connection.?string/i.test(key) &&
          !(['password_reset', 'must_change_password'].includes(key) && typeof item === 'boolean'))
          ? '[REDACTED]'
          : redactAudit(item),
      ]),
    );
  }
  return value;
}
