import { useMemo, type ComponentPropsWithoutRef } from 'react'
import { cx } from '../util/cx'
import { IntlContext, LABELS_EN, type Labels } from '../util/intl'

export type Density = 'compact' | 'touch'

export interface RootProps extends ComponentPropsWithoutRef<'div'> {
  /**
   * A BCP 47 tag for everything the kit formats: month and weekday names, the
   * first day of the week, twelve or twenty-four hours. Left unset it follows
   * the browser, which follows the system — usually the right answer.
   */
  locale?: string
  /**
   * The kit's own words. Partial: give the ones the product cares about and
   * the rest stay English. `LABELS_RU` is a complete Russian set.
   *
   * Nothing here is a date. Those come out of `Intl` for the locale above,
   * so a translation of the calendar is neither needed nor accepted.
   */
  labels?: Partial<Labels>
  /** `auto` follows the OS preference. Pin it only if the product has a toggle. */
  theme?: 'auto' | 'light' | 'dark'
  /**
   * How big the controls are. `compact` is a desktop row — a filter bar and a
   * table of objects on one screen. `touch` is thumb-sized: every control
   * grows, and its text and padding grow with it.
   *
   * This is a property of the device, not of the button, which is why it is
   * set once here instead of per control. Everything that resolves the
   * control tokens moves together — a field's label, its input and the error
   * under it stay one row.
   */
  density?: Density
}

/**
 * Wrap the application once. Establishes the typography contract, the focus
 * contract, and the `page` container that space-driven layouts query.
 *
 * When the product offers a theme switch, prefer `applyTheme` over the `theme`
 * prop: native dialogs and popovers render in the top layer, outside this
 * element, so the attribute has to sit on <html> for them to follow along.
 * `applyDensity` exists for the same reason.
 */
export function Root({ theme, density, locale, labels, className, ...rest }: RootProps) {
  // Merged once rather than per read: the object identity is what decides
  // whether every control in the tree re-renders.
  const intl = useMemo(
    () => ({ locale, labels: labels ? { ...LABELS_EN, ...labels } : LABELS_EN }),
    [locale, labels],
  )

  return (
    <IntlContext.Provider value={intl}>
      <div
        className={cx('cx-root', className)}
        data-cx-theme={theme === 'auto' ? undefined : theme}
        data-cx-density={density === 'compact' ? undefined : density}
        lang={locale}
        {...rest}
      />
    </IntlContext.Provider>
  )
}

/** Sets the theme on <html>, so the top layer and ::backdrop follow it too. */
export function applyTheme(theme: 'auto' | 'light' | 'dark'): void {
  const root = document.documentElement
  if (theme === 'auto') root.removeAttribute('data-cx-theme')
  else root.setAttribute('data-cx-theme', theme)
}

/** Same reasoning as `applyTheme`: dialogs and popovers are not in your tree. */
export function applyDensity(density: Density): void {
  const root = document.documentElement
  if (density === 'compact') root.removeAttribute('data-cx-density')
  else root.setAttribute('data-cx-density', density)
}
