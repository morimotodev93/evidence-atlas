import { getSentryTracesSampleRate } from "@/lib/observability/sentry-config";
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NODE_ENV,
  // Keep error monitoring only, including when tracing env vars are present.
  tracesSampleRate: getSentryTracesSampleRate(),

  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
    stackFrameVariables: false,
    genAI: {
      inputs: false,
      outputs: false,
    },
    databaseQueryData: false,
    queues: false,
    graphQL: {
      document: false,
      variables: false,
    },
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
