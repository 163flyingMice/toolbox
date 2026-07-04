import React, { useCallback, useEffect, useState } from 'react';

const TOAST_EVENT = 'local-preview-toast';
const TOAST_TEXT_LIMIT = 180;

function clampToastText(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= TOAST_TEXT_LIMIT) return text;
  return text.slice(0, TOAST_TEXT_LIMIT - 1) + '…';
}

export function useToast() {
  const toast = useCallback(options => {
    window.dispatchEvent(new CustomEvent(TOAST_EVENT, {
      detail: {
        id: Date.now() + Math.random(),
        title: clampToastText(options?.title),
        description: clampToastText(options?.description),
        variant: options?.variant || 'default'
      }
    }));
  }, []);

  return {
    toast
  };
}

export function ToastViewport() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const onToast = event => {
      const next = event.detail;
      setItems(prev => [next, ...prev].slice(0, 3));
      window.setTimeout(() => {
        setItems(prev => prev.filter(item => item.id !== next.id));
      }, next.variant === 'destructive' ? 5200 : 4200);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  if (!items.length) return null;

  return <div className="app-toast-viewport fixed right-4 top-4 z-[10000] w-[360px] max-w-[calc(100vw-2rem)] space-y-2">
      {items.map(item => {
      const isError = item.variant === 'destructive';
      return <div key={item.id} className={`app-toast-item rounded-xl border px-4 py-3.5 shadow-2xl backdrop-blur ${isError ? 'app-toast-error border-dev-orange/50 bg-[#2a1714]/95 text-dev-orange' : 'app-toast-ok border-dev-green/45 bg-dev-panel/95 text-dev-text'}`}>
            <div className="flex gap-3">
              <div className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${isError ? 'bg-dev-orange' : 'bg-dev-green'}`} />
              <div className="min-w-0">
                {item.title && <div className="text-sm font-heading font-semibold leading-snug">{item.title}</div>}
                {item.description && <div className="mt-1 text-xs font-mono text-dev-muted leading-relaxed">{item.description}</div>}
              </div>
            </div>
          </div>;
    })}
    </div>;
}
