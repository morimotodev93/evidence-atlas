// Build-selected inert adapter for browser/server instrumentation and errors.
// No SDK import, public mode flag, transport, DSN parsing or network operations.
export function init(_options: unknown): void {}
export function getSentryTracesSampleRate(): number { return 0; }
export function captureException(_error: unknown, _context?: unknown): string { return ""; }
export function captureRequestError(..._args: unknown[]): void {}
export function captureRouterTransitionStart(..._args: unknown[]): void {}
export function startSpan<T>(_options: unknown, callback: (span: { setAttribute: (key: string, value: unknown) => void }) => T): T {
  return callback({ setAttribute() {} });
}
