export function getSentryTracesSampleRate(): number {
  const value = Number(
    process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? "0",
  );

  if (!Number.isFinite(value) || value < 0 || value > 1) {
    return 0;
  }

  return value;
}
