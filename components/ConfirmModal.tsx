import { useState, useCallback, useEffect, useRef } from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'

const playfair = 'var(--font-playfair, "Playfair Display", serif)'

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
  }, [])

  return (
    <AlertDialog open onOpenChange={(open) => { if (!open) onCancel() }}>
      <AlertDialogContent
        className="max-w-[380px] rounded-xl border border-white/10 bg-[#1e1509] p-7 shadow-[0_24px_60px_rgba(26,18,9,0.6)]"
      >
        <AlertDialogTitle
          className="mb-2.5 text-[1.15rem] font-bold leading-snug text-gold"
          style={{ fontFamily: playfair }}
        >
          {title}
        </AlertDialogTitle>

        <AlertDialogDescription className="mb-6 text-[0.75rem] leading-relaxed text-cream/60">
          {message}
        </AlertDialogDescription>

        <AlertDialogFooter className="flex justify-end gap-2.5">
          <AlertDialogCancel
            onClick={onCancel}
            className="rounded-md border-none bg-white/[0.07] px-4 py-2.5 font-mono text-[0.7rem] uppercase tracking-[0.08em] text-cream/50 transition-all hover:opacity-80 hover:-translate-y-px"
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            ref={confirmRef}
            onClick={onConfirm}
            className={cn(
              'rounded-md border-none px-4 py-2.5 font-mono text-[0.7rem] uppercase tracking-[0.08em] transition-all hover:opacity-80 hover:-translate-y-px',
              danger
                ? 'bg-brand-red text-white'
                : 'bg-white/[0.12] text-cream',
            )}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
