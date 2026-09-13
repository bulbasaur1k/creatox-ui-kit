/* Замер отзывчивости с настоящего устройства. Включается `?perf` в адресе:
   Event Timing API отдаёт по каждому взаимодействию три числа — сколько
   ввод ждал главный поток, сколько шла обработка, сколько до следующего
   кадра, — и они уходят на dev-сервер, где их видно в логе. Телефон в руке,
   цифры на экране разработчика. */

if (new URLSearchParams(location.search).has('perf')) {
  const queue: string[] = []
  let timer: number | null = null

  const flush = () => {
    timer = null
    if (queue.length === 0) return
    const body = JSON.stringify(queue.splice(0))
    if (!navigator.sendBeacon('/__perf', body)) {
      fetch('/__perf', { method: 'POST', body, keepalive: true }).catch(() => {})
    }
  }
  const send = (line: string) => {
    queue.push(line)
    timer ??= window.setTimeout(flush, 500)
  }

  const describe = (node: Node | null) => {
    const el = node instanceof Element ? node : null
    if (!el) return '?'
    const label = el.closest('label, button, a, [role]') ?? el
    const text = (label.getAttribute('aria-label') ?? label.textContent ?? '')
      .trim()
      .slice(0, 24)
    return `${label.tagName.toLowerCase()}${label.getAttribute('role') ? `[${label.getAttribute('role')}]` : ''} "${text}"`
  }

  new PerformanceObserver((list) => {
    for (const entry of list.getEntries() as PerformanceEventTiming[]) {
      if (!['pointerdown', 'pointerup', 'click', 'keydown'].includes(entry.name)) continue
      const input = Math.round(entry.processingStart - entry.startTime)
      const processing = Math.round(entry.processingEnd - entry.processingStart)
      const present = Math.round(entry.duration - (entry.processingEnd - entry.startTime))
      send(
        `${entry.name.padEnd(11)} ${describe(entry.target)} ` +
          `input=${input}ms processing=${processing}ms present=${present}ms total=${Math.round(entry.duration)}ms`,
      )
    }
  }).observe({
    type: 'event',
    durationThreshold: 16,
    buffered: true,
  } as PerformanceObserverInit)

  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      send(`longtask ${Math.round(entry.duration)}ms`)
    }
  }).observe({ type: 'longtask', buffered: true })

  send(`connected ${navigator.userAgent}`)
}
