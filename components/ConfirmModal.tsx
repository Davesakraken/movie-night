import { useState, useCallback, useEffect, useRef } from 'react'

export interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

interface DialogProps extends ConfirmOptions {
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}: DialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    confirmRef.current?.focus()
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onCancel])

  return (
    <>
      <style jsx global>{`
        .confirm-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(26, 18, 9, 0.82);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 24px;
          animation: confirm-fade-in 0.12s ease;
        }

        @keyframes confirm-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .confirm-modal {
          background: #1e1509;
          border: 1px solid rgba(245, 239, 224, 0.1);
          border-radius: 12px;
          padding: 28px 28px 24px;
          max-width: 380px;
          width: 100%;
          box-shadow: 0 24px 60px rgba(26, 18, 9, 0.6);
          animation: confirm-slide-up 0.15s ease;
        }

        @keyframes confirm-slide-up {
          from { transform: translateY(8px); opacity: 0; }
          to   { transform: translateY(0);  opacity: 1; }
        }

        .confirm-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.15rem;
          font-weight: 700;
          color: #c9952a;
          margin-bottom: 10px;
          line-height: 1.3;
        }

        .confirm-message {
          font-family: 'DM Mono', monospace;
          font-size: 0.75rem;
          color: rgba(245, 239, 224, 0.6);
          line-height: 1.6;
          margin-bottom: 24px;
        }

        .confirm-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        .confirm-btn {
          font-family: 'DM Mono', monospace;
          font-size: 0.7rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          border: none;
          border-radius: 6px;
          padding: 10px 18px;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.1s;
        }

        .confirm-btn:hover { opacity: 0.82; transform: translateY(-1px); }
        .confirm-btn:active { transform: translateY(0); }

        .confirm-cancel {
          background: rgba(255, 255, 255, 0.07);
          color: rgba(245, 239, 224, 0.5);
        }

        .confirm-ok {
          background: rgba(255, 255, 255, 0.12);
          color: #f5efe0;
        }

        .confirm-ok.is-danger {
          background: #c0392b;
          color: #fff;
        }
      `}</style>

      <div className="confirm-backdrop" onClick={onCancel}>
        <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title" onClick={e => e.stopPropagation()}>
          <p className="confirm-title" id="confirm-title">{title}</p>
          <p className="confirm-message">{message}</p>
          <div className="confirm-actions">
            <button className="confirm-btn confirm-cancel" onClick={onCancel}>
              {cancelLabel}
            </button>
            <button
              ref={confirmRef}
              className={`confirm-btn confirm-ok${danger ? ' is-danger' : ''}`}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

type State = ConfirmOptions & { resolve: (v: boolean) => void }

export function useConfirm() {
  const [state, setState] = useState<State | null>(null)

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setState({ ...opts, resolve })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    setState(prev => { prev?.resolve(true); return null })
  }, [])

  const handleCancel = useCallback(() => {
    setState(prev => { prev?.resolve(false); return null })
  }, [])

  const dialog = state ? (
    <ConfirmDialog
      {...state}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null

  return { confirm, dialog }
}
