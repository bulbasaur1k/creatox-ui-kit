import { afterEach, expect, test } from 'bun:test'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Sheet } from '../src/primitives/Sheet'

let root: Root | undefined

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
})

function mountSheet() {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  const render = (open: boolean) => {
    act(() =>
      root!.render(
        <Sheet open={open} onClose={() => {}} title="Account" detent="peek">
          <button>Settings</button>
        </Sheet>,
      ),
    )
  }
  render(true)
  const dialog = host.querySelector('dialog')!
  const endSlide = (target: Element = dialog, propertyName = 'translate') => {
    const event = new Event('transitionend', { bubbles: true })
    Object.assign(event, { propertyName })
    act(() => target.dispatchEvent(event))
  }
  return { dialog, render, endSlide }
}

test('sheet keeps its exit state through native close until reopened', () => {
  const { dialog, render, endSlide } = mountSheet()
  render(false)
  expect(dialog.open).toBe(true)
  expect(dialog.dataset.closing).toBe('true')

  // close() must never see the arrival state, even if focusing steps flush CSS.
  const close = dialog.close.bind(dialog)
  let closingAtClose: string | undefined
  dialog.close = () => {
    closingAtClose = dialog.dataset.closing
    close()
  }
  endSlide()
  expect(closingAtClose).toBe('true')
  expect(dialog.open).toBe(false)
  expect(dialog.dataset.closing).toBe('true')

  render(true)
  expect(dialog.open).toBe(true)
  expect(dialog.dataset.closing).toBeUndefined()
})

test('content transitions and unrelated properties do not finish the sheet exit', () => {
  const { dialog, render, endSlide } = mountSheet()
  render(false)
  endSlide(dialog.querySelector('button')!)
  endSlide(dialog, 'opacity')
  expect(dialog.open).toBe(true)
  endSlide()
  expect(dialog.open).toBe(false)
})

test('reopening during exit cancels both the listener and the fallback timer', async () => {
  const { dialog, render, endSlide } = mountSheet()
  render(false)
  render(true)
  endSlide()
  await act(() => new Promise((resolve) => setTimeout(resolve, 80)))
  expect(dialog.open).toBe(true)
  expect(dialog.dataset.closing).toBeUndefined()
})

test('sheet still closes when no transitionend is delivered', async () => {
  const { dialog, render } = mountSheet()
  render(false)
  await act(() => new Promise((resolve) => setTimeout(resolve, 80)))
  expect(dialog.open).toBe(false)
  expect(dialog.dataset.closing).toBe('true')
})
