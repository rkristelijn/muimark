'use client';

import { useEffect } from 'react';

/**
 * Catches uncaught browser errors and unhandled promise rejections,
 * POSTs them to /api/log so they show up in the server terminal.
 *
 * Only active when NEXT_PUBLIC_BROWSER_LOGGING=true.
 * Does NOT patch console.error (too noisy with MUI warnings).
 */
export function BrowserErrorReporter() {
  const enabled = process.env.NEXT_PUBLIC_BROWSER_LOGGING === 'true';

  useEffect(() => {
    if (!enabled) return;

    function report(level: string, message: string, stack?: string) {
      fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level,
          message: message.slice(0, 500),
          stack: stack?.split('\n').slice(0, 3).join('\n'),
          url: window.location.pathname,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {});
    }

    function handleError(event: ErrorEvent) {
      report('error', event.message, event.error?.stack);
    }

    function handleRejection(event: PromiseRejectionEvent) {
      const message = event.reason?.message || String(event.reason);
      report('rejection', message, event.reason?.stack);
    }

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [enabled]);

  return null;
}
