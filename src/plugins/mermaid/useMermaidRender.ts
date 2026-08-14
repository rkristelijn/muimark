'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface RenderResult {
  svg: string;
  error: string | null;
  isRendering: boolean;
}

/**
 * Hook that renders Mermaid text to SVG with debouncing and error handling.
 * Mermaid is loaded dynamically (client-only) to avoid SSR issues.
 */
export function useMermaidRender(code: string, debounceMs = 300): RenderResult {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const renderIdRef = useRef(0);

  const render = useCallback(async (source: string) => {
    if (!source.trim()) {
      setSvg('');
      setError(null);
      return;
    }

    setIsRendering(true);
    const currentId = ++renderIdRef.current;

    try {
      const mermaid = (await import('mermaid')).default;

      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'loose',
        fontFamily: 'Roboto, sans-serif',
      });

      const elementId = `mermaid-render-${currentId}`;
      const { svg: renderedSvg } = await mermaid.render(elementId, source);

      // Only update if this is still the latest render
      if (currentId === renderIdRef.current) {
        setSvg(renderedSvg);
        setError(null);
      }
    } catch (err: unknown) {
      if (currentId === renderIdRef.current) {
        setSvg('');
        const message =
          err instanceof Error ? err.message : 'Unknown render error';
        // Clean up mermaid's verbose error messages
        const cleanMessage = message
          .replace(/Syntax error in text[\s\S]*?mermaid version[\s\S]*$/m, '')
          .replace(/Expecting[\s\S]*?got '/m, "Expecting '")
          .trim();
        setError(cleanMessage || message);
      }
    } finally {
      if (currentId === renderIdRef.current) {
        setIsRendering(false);
      }
    }
  }, []);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      render(code);
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [code, debounceMs, render]);

  return { svg, error, isRendering };
}
