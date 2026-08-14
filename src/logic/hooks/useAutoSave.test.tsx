// @covers F-022 Auto-save
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useAutoSave } from './useAutoSave';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  Wrapper.displayName = 'TestQueryWrapper';
  return Wrapper;
}

const mockFileResponse = {
  content: '# Hello',
  frontmatter: { status: 'Open' },
  filename: 'test.md',
};

describe('useAutoSave', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('loads file content and initializes state', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockFileResponse),
    });

    const { result } = renderHook(
      () => useAutoSave('incidents', 'I-001'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.content).toBe('# Hello');
    });

    expect(result.current.saveStatus).toBe('saved');
    expect(result.current.file?.filename).toBe('test.md');
  });

  it('marks as dirty when content is edited', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockFileResponse),
    });

    const { result } = renderHook(
      () => useAutoSave('incidents', 'I-001'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.content).toBe('# Hello');
    });

    act(() => {
      result.current.setContent('# Updated');
    });

    expect(result.current.content).toBe('# Updated');
    expect(result.current.saveStatus).toBe('dirty');
  });

  it('auto-saves after debounce period', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockFileResponse),
    });

    const { result } = renderHook(
      () => useAutoSave('incidents', 'I-001'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.content).toBe('# Hello');
    });

    act(() => {
      result.current.setContent('# Auto saved');
    });

    // Wait for debounce (1s) + save to complete
    await waitFor(
      () => {
        expect(result.current.saveStatus).toBe('saved');
      },
      { timeout: 3000 }
    );

    // Verify PUT was called
    const putCall = mockFetch.mock.calls.find(
      (call) => call[1]?.method === 'PUT'
    );
    expect(putCall).toBeDefined();
  });

  it('saveNow triggers immediate save', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockFileResponse),
    });

    const { result } = renderHook(
      () => useAutoSave('incidents', 'I-001'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.content).toBe('# Hello');
    });

    act(() => {
      result.current.setContent('# Immediate');
    });

    await act(async () => {
      result.current.saveNow();
    });

    await waitFor(() => {
      expect(result.current.saveStatus).toBe('saved');
    });
  });

  it('sets error status on save failure', async () => {
    let callCount = 0;
    mockFetch.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First call: GET file
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockFileResponse),
        });
      }
      // Subsequent calls: PUT fails
      return Promise.resolve({ ok: false });
    });

    const { result } = renderHook(
      () => useAutoSave('incidents', 'I-001'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.content).toBe('# Hello');
    });

    act(() => {
      result.current.setContent('# Will fail');
    });

    await act(async () => {
      result.current.saveNow();
    });

    await waitFor(() => {
      expect(result.current.saveStatus).toBe('error');
    });
  });
});
