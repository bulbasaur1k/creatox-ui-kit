import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentPropsWithoutRef,
  type DragEvent,
  type ReactNode,
} from 'react'
import { cx } from '../util/cx'
import { useLabels, useLocale } from '../util/intl'
import { upload, x } from '../icons'
import { Icon } from './Icon'
import { IconButton } from './IconButton'
import { Progress } from './Progress'
import { Status } from './Status'

/* ── Upload ────────────────────────────────────────────────────────────────
   A native file input with a place to drop things on. That is the whole
   contract: files go out through `onFiles`, and nothing here talks to a
   server. Upload progress, retries and what "done" means belong to the
   product — a farfetched mutation, an XHR with a progress event — and come
   back in through `UploadItem` as plain numbers and words.

   The input stays a real `<input type="file">` behind the label: keyboard
   activation, the platform picker, `accept` and `capture` are all its own. */

export type UploadRejection = { file: File; reason: 'type' | 'size' }

export interface UploadProps extends Omit<
  ComponentPropsWithoutRef<'input'>,
  'type' | 'value' | 'onChange' | 'size'
> {
  onFiles: (files: File[]) => void
  /** Bytes. Larger files are reported through `onReject` instead. */
  maxSize?: number
  onReject?: (rejected: UploadRejection[]) => void
  /** The line in the drop zone. Defaults to the kit's label. */
  prompt?: ReactNode
  /** Under the prompt — formats, limits, how many. */
  hint?: ReactNode
  compact?: boolean
}

/** `accept` the way the input understands it: extensions and MIME patterns. */
function accepts(file: File, accept: string | undefined): boolean {
  if (!accept) return true
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()
  return accept.split(',').some((raw) => {
    const rule = raw.trim().toLowerCase()
    if (rule === '') return false
    if (rule.startsWith('.')) return name.endsWith(rule)
    if (rule.endsWith('/*')) return type.startsWith(rule.slice(0, -1))
    return type === rule
  })
}

export function Upload({
  onFiles,
  maxSize,
  onReject,
  prompt,
  hint,
  compact,
  accept,
  multiple,
  disabled,
  className,
  id: idProp,
  ...rest
}: UploadProps) {
  const labels = useLabels()
  const generated = useId()
  const id = idProp ?? generated
  const input = useRef<HTMLInputElement>(null)
  // Enter/leave fire for every child the pointer crosses; counting them is
  // what keeps the highlight from flickering on the way across the zone.
  const depth = useRef(0)
  const [dragging, setDragging] = useState(false)

  const take = (list: FileList | File[] | null) => {
    if (!list) return
    const files: File[] = []
    const rejected: UploadRejection[] = []
    for (const file of Array.from(list)) {
      if (!accepts(file, accept)) rejected.push({ file, reason: 'type' })
      else if (maxSize !== undefined && file.size > maxSize)
        rejected.push({ file, reason: 'size' })
      else files.push(file)
    }
    const chosen = multiple ? files : files.slice(0, 1)
    if (chosen.length > 0) onFiles(chosen)
    if (rejected.length > 0) onReject?.(rejected)
  }

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    take(event.target.files)
    // Choosing the same file twice must fire twice; a file input only
    // reports a change when the value differs.
    event.target.value = ''
  }

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    depth.current = 0
    setDragging(false)
    if (!disabled) take(event.dataTransfer.files)
  }

  return (
    <label
      htmlFor={id}
      data-dragging={dragging ? '' : undefined}
      onDragEnter={(event) => {
        event.preventDefault()
        if (depth.current++ === 0) setDragging(true)
      }}
      onDragLeave={() => {
        if (--depth.current === 0) setDragging(false)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      className={cx(
        'flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-line-strong',
        'bg-raised text-fg transition-colors duration-snap ease-snap',
        'hover:border-line-accent hover:bg-hover',
        'has-[:focus-visible]:border-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent',
        'data-dragging:border-accent data-dragging:bg-accent-subtle',
        'has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-45',
        compact ? 'px-3 py-2' : 'flex-col justify-center px-4 py-6 text-center',
        className,
      )}
    >
      <input
        ref={input}
        id={id}
        type="file"
        className="sr-only"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={onChange}
        {...rest}
      />
      <Icon
        className={cx('shrink-0 text-fg-muted', compact ? 'text-[1.1em]' : 'text-title')}
      >
        {upload}
      </Icon>
      <span className="min-w-0">
        <span className="block text-ui font-medium">{prompt ?? labels.uploadPrompt}</span>
        {hint !== undefined && (
          <span className="block text-meta text-fg-muted">{hint}</span>
        )}
      </span>
    </label>
  )
}

/* ── The list ──────────────────────────────────────────────────────────────*/

export interface UploadItemProps extends Omit<
  ComponentPropsWithoutRef<'li'>,
  'children'
> {
  name: ReactNode
  /** Bytes; formatted for the locale in force. */
  size?: number
  /** 0–100 while in flight. Omit when it is not a transfer, or it is over. */
  progress?: number
  status?: 'pending' | 'done' | 'error'
  /** What went wrong, shown under the name. */
  error?: ReactNode
  onRemove?: () => void
}

export function UploadList({ className, ...rest }: ComponentPropsWithoutRef<'ul'>) {
  return (
    <ul className={cx('m-0 flex list-none flex-col gap-1 p-0', className)} {...rest} />
  )
}

export function UploadItem({
  name,
  size,
  progress,
  status,
  error,
  onRemove,
  className,
  ...rest
}: UploadItemProps) {
  const labels = useLabels()
  const locale = useLocale()
  return (
    <li
      className={cx(
        'flex items-center gap-3 rounded-md border-[length:var(--cx-hairline)] border-line bg-raised px-3 py-2',
        className,
      )}
      {...rest}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="min-w-0 truncate text-ui">{name}</span>
          {size !== undefined && (
            <span className="shrink-0 text-meta text-fg-muted tabular-nums">
              {formatBytes(size, locale)}
            </span>
          )}
          {status === 'done' && (
            <Status tone="success" markOnly className="shrink-0">
              {labels.uploadDone}
            </Status>
          )}
        </div>
        {progress !== undefined && status !== 'done' && status !== 'error' && (
          <Progress value={progress} className="mt-1" />
        )}
        {status === 'error' && (
          <p className="m-0 mt-0.5 text-meta text-danger-fg">
            {error ?? labels.uploadFailed}
          </p>
        )}
      </div>
      {onRemove !== undefined && (
        <IconButton
          size="sm"
          label={labels.remove}
          tooltip
          icon={<Icon>{x}</Icon>}
          onClick={onRemove}
          className="shrink-0"
        />
      )}
    </li>
  )
}

/** 1 KB is 1024 bytes here, the way file managers count. */
export function formatBytes(bytes: number, locale?: string): string {
  const units = ['byte', 'kilobyte', 'megabyte', 'gigabyte'] as const
  let value = bytes
  let index = 0
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index++
  }
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: units[index],
    unitDisplay: 'short',
    maximumFractionDigits: value < 10 && index > 0 ? 1 : 0,
  }).format(value)
}
