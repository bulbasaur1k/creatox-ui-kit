import { GlobalRegistrator } from '@happy-dom/global-registrator'

GlobalRegistrator.register()

/* happy-dom не реализует popover API, а кит на нём и стоит. Полифилл ровно на
   ту часть, которой пользуется код: показать, скрыть, ответить на
   `:popover-open` и разослать `beforetoggle`. Это подпорка для измерений, а не
   модель браузера — поведение слоёв, light dismiss и Escape проверяются на
   стенде в настоящем движке. */
const openPopovers = new WeakSet<Element>()

const proto = globalThis.HTMLElement.prototype as unknown as {
  showPopover: (options?: { source?: Element }) => void
  hidePopover: () => void
}

function fire(element: Element, newState: 'open' | 'closed') {
  const event = new Event('beforetoggle') as Event & { newState: string }
  event.newState = newState
  element.dispatchEvent(event)
}

proto.showPopover = function showPopover(this: Element) {
  if (openPopovers.has(this)) return
  openPopovers.add(this)
  fire(this, 'open')
}

proto.hidePopover = function hidePopover(this: Element) {
  if (!openPopovers.has(this)) return
  openPopovers.delete(this)
  fire(this, 'closed')
}

const nativeMatches = globalThis.Element.prototype.matches
globalThis.Element.prototype.matches = function matches(this: Element, selector: string) {
  if (selector === ':popover-open') return openPopovers.has(this)
  return nativeMatches.call(this, selector)
}

// React 19 требует явного согласия на act() вне тестового рендерера.
;(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true
