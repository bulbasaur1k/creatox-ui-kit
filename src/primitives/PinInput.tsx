import { useId, type ClipboardEvent, type ReactNode } from 'react'
import { cx } from '../util/cx'

/* ── PinInput ──────────────────────────────────────────────────────────────
   The one-time code from an email or an SMS.

   One real input, not one per character. A row of separate inputs is the
   common shape and it is the wrong one: paste lands in the first box, SMS
   autofill fills the first box, undo is per box, and selecting the code to
   retype it takes six gestures. All of that comes from splitting a single
   value across six form controls.

   So the value stays in one input, spread across the row by letter-spacing,
   and the boxes underneath are drawn — they are not controls, and they carry
   no state beyond what the value already says. The caret is the browser's.  */

export interface PinInputProps {
  value: string
  onValueChange: (value: string) => void
  /** How many characters the code has. Six is the usual. */
  length?: number
  /** Digits keep the numeric keypad; `text` allows letters. */
  type?: 'numeric' | 'text'
  name?: string
  id?: string
  disabled?: boolean
  invalid?: boolean
  autoFocus?: boolean
  label?: ReactNode
  'aria-describedby'?: string
  className?: string
}

export function PinInput({
  value,
  onValueChange,
  length = 6,
  type = 'numeric',
  name,
  id,
  disabled,
  invalid,
  autoFocus,
  label,
  className,
  ...rest
}: PinInputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  const accept = (next: string) => {
    const cleaned = type === 'numeric' ? next.replace(/\D/g, '') : next.replace(/\s/g, '')
    onValueChange(cleaned.slice(0, length))
  }

  // Codes get pasted with the spaces and dashes people's mail clients put in.
  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    accept(event.clipboardData.getData('text'))
  }

  const characters = Array.from({ length }, (_, index) => value[index] ?? '')

  return (
    <div
      className={cx('cx-pin group/pin relative inline-flex gap-2', className)}
      data-disabled={disabled || undefined}
    >
      <input
        id={inputId}
        name={name}
        value={value}
        onChange={(event) => accept(event.target.value)}
        onPaste={onPaste}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-label={typeof label === 'string' ? label : undefined}
        aria-invalid={invalid || undefined}
        // The pair that makes the platform hand over the code by itself: iOS
        // offers it above the keyboard, Android and Chrome fill it from the
        // SMS retriever. Neither works on a row of one-character inputs.
        autoComplete="one-time-code"
        inputMode={type === 'numeric' ? 'numeric' : 'text'}
        pattern={type === 'numeric' ? '[0-9]*' : undefined}
        maxLength={length}
        spellCheck={false}
        className="cx-pin-input"
        {...rest}
      />

      {characters.map((character, index) => (
        <div
          key={index}
          aria-hidden="true"
          data-filled={character !== '' || undefined}
          // The slot the caret is in. Reading it off the length rather than a
          // focus event is why this component holds no state of its own.
          data-active={
            (index === Math.min(value.length, length - 1) &&
              (value.length < length || index === length - 1)) ||
            undefined
          }
          className={cx(
            'flex size-control-lg items-center justify-center',
            'rounded-control border border-line-strong bg-raised',
            'text-control-lg font-medium text-fg tabular-nums',
            'transition-colors duration-snap ease-snap',
            'group-has-[:focus-visible]/pin:data-active:border-accent',
            'group-has-[:focus-visible]/pin:data-active:outline-2',
            'group-has-[:focus-visible]/pin:data-active:outline-accent',
            'group-data-disabled/pin:bg-subtle',
            invalid && 'border-danger bg-danger-surface',
          )}
        >
          {character}
        </div>
      ))}
    </div>
  )
}
