import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRouterState } from './useRouterState';

// Mock fetch for resolve API
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useRouterState', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    // Default: no file to resolve
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    // Reset URL
    window.history.replaceState(null, '', '/');
  });

  it('initializes with null folder and file on /', () => {
    const { result } = renderHook(() => useRouterState());

    expect(result.current.selectedFolder).toBe(null);
    expect(result.current.selectedFile).toBe(null);
  });

  it('parses folder from URL /incidents', () => {
    window.history.replaceState(null, '', '/incidents');

    const { result } = renderHook(() => useRouterState());

    expect(result.current.selectedFolder).toBe('incidents');
    expect(result.current.selectedFile).toBe(null);
  });

  it('parses folder and file from URL', async () => {
    window.history.replaceState(null, '', '/incidents/I-001');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ fileId: 'I-001-web-server' }),
    });

    const { result } = renderHook(() => useRouterState());

    expect(result.current.selectedFolder).toBe('incidents');
    // File resolves async
  });

  it('navigate() pushes to history', () => {
    const { result } = renderHook(() => useRouterState());

    act(() => {
      result.current.navigate('changes', 'SC-001');
    });

    expect(window.location.pathname).toBe('/changes/SC-001');
  });

  it('navigate() with folder only', () => {
    const { result } = renderHook(() => useRouterState());

    act(() => {
      result.current.navigate('runbooks', null);
    });

    expect(window.location.pathname).toBe('/runbooks');
  });

  it('goHome() resets state and navigates to /', () => {
    window.history.replaceState(null, '', '/incidents/I-001');
    const { result } = renderHook(() => useRouterState());

    act(() => {
      result.current.goHome();
    });

    expect(result.current.selectedFolder).toBe(null);
    expect(result.current.selectedFile).toBe(null);
    expect(window.location.pathname).toBe('/');
  });

  it('setSelectedFolder updates state', () => {
    const { result } = renderHook(() => useRouterState());

    act(() => {
      result.current.setSelectedFolder('problems');
    });

    expect(result.current.selectedFolder).toBe('problems');
  });

  it('responds to popstate (back/forward)', () => {
    const { result } = renderHook(() => useRouterState());

    // Navigate somewhere
    act(() => {
      result.current.navigate('incidents', 'I-001');
    });

    // Simulate browser back
    act(() => {
      window.history.replaceState(null, '', '/changes');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(result.current.selectedFolder).toBe('changes');
    expect(result.current.selectedFile).toBe(null);
  });
});
