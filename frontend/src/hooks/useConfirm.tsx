import { useState, useCallback, useRef } from 'react';

interface ConfirmState {
  isOpen: boolean;
  message: string;
  title?: string;
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({ isOpen: false, message: '' });
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((message: string, title?: string): Promise<boolean> => {
    setState({ isOpen: true, message, title });
    return new Promise((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setState((s) => ({ ...s, isOpen: false }));
    resolveRef.current?.(true);
    resolveRef.current = null;
  }, []);

  const handleCancel = useCallback(() => {
    setState((s) => ({ ...s, isOpen: false }));
    resolveRef.current?.(false);
    resolveRef.current = null;
  }, []);

  const ConfirmDialog = useCallback(() => {
    if (!state.isOpen) return null;
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={handleCancel}
      >
        <div
          className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] shadow-2xl w-[380px] max-w-[90vw] p-5 animate-fade-in"
          style={{ animationDuration: '150ms' }}
          onClick={(e) => e.stopPropagation()}
        >
          {state.title && (
            <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">{state.title}</h3>
          )}
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{state.message}</p>
          <div className="flex justify-end gap-2 mt-5">
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 rounded-lg text-sm bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity"
            >
              确定
            </button>
          </div>
        </div>
      </div>
    );
  }, [state.isOpen, state.message, state.title, handleConfirm, handleCancel]);

  return { confirm, ConfirmDialog };
}
