import type { GlobalProvider } from '@ladle/react'
import { useEffect } from 'react'
import '../src/styles/index.css'
import { Root, applyTheme } from '../src'

/**
 * Every story renders inside <Root>, because that is where the typography and
 * focus contracts live and where the `page` container is declared — a component
 * shown outside it would be lying about how it behaves in a product.
 */
export const Provider: GlobalProvider = ({ children, globalState }) => {
  const dark = globalState.theme === 'dark'

  useEffect(() => {
    applyTheme(dark ? 'dark' : 'light')
  }, [dark])

  return <Root className="min-h-screen p-6">{children}</Root>
}
