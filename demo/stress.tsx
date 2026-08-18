import { Activity, StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/styles/index.css'
import {
  Button,
  Calendar,
  Checkbox,
  Combobox,
  Menu,
  MenuItem,
  Popover,
  Radio,
  Select,
  Toggle,
  usePopover,
} from '../src/index'

/* Стенд для ручной проверки выпадашек: счётчики подписок, узлов DOM и
   рассинхрона aria-expanded против :popover-open обновляются вживую, так что
   мышью можно долбить по триггеру сколько угодно и смотреть, что происходит. */

const metrics = { add: 0, rem: 0, toggleAdd: 0, toggleRem: 0, errors: 0 }

const nativeAdd = EventTarget.prototype.addEventListener
const nativeRemove = EventTarget.prototype.removeEventListener

EventTarget.prototype.addEventListener = function (this: EventTarget, type, ...rest) {
  metrics.add++
  if (type === 'toggle' || type === 'beforetoggle') metrics.toggleAdd++
  return nativeAdd.call(this, type, ...rest)
} as typeof nativeAdd

EventTarget.prototype.removeEventListener = function (this: EventTarget, type, ...rest) {
  metrics.rem++
  if (type === 'toggle' || type === 'beforetoggle') metrics.toggleRem++
  return nativeRemove.call(this, type, ...rest)
} as typeof nativeRemove

window.addEventListener('error', () => metrics.errors++)
window.addEventListener('unhandledrejection', () => metrics.errors++)

const REGIONS = [
  'eu-west-1',
  'eu-west-2',
  'eu-central-1',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'ap-south-1',
  'ap-northeast-1',
  'sa-east-1',
  'af-south-1',
]

const GROUPED = [
  { value: '__eu', label: 'Europe', heading: true },
  { value: 'eu-west-1', label: 'eu-west-1' },
  { value: 'eu-central-1', label: 'eu-central-1' },
  { value: '__us', label: 'North America', heading: true },
  { value: 'us-east-1', label: 'us-east-1' },
  { value: 'us-west-2', label: 'us-west-2' },
]

const HUGE = Array.from({ length: 2000 }, (_, i) => `option-${i}`)

/** Читает состояние всех выпадашек на странице прямо из DOM. */
function readState() {
  const rows = [...document.querySelectorAll<HTMLElement>('[role=combobox]')].map(
    (el, i) => {
      // Через aria-controls, а не popovertarget: у Combobox инвокером теперь
      // выступает сам инпут через showPopover({ source }).
      const box = document.getElementById(el.getAttribute('aria-controls') ?? '')
      const list = box?.closest('[popover]') ?? null
      const open = list?.matches(':popover-open') ?? false
      const aria = el.getAttribute('aria-expanded') === 'true'
      const desc = el.getAttribute('aria-activedescendant')
      return {
        i,
        name: el.getAttribute('data-name') ?? el.id,
        open,
        aria,
        desync: open !== aria,
        descBroken: desc !== null && document.getElementById(desc) === null,
      }
    },
  )
  return {
    rows,
    nodes: document.getElementsByTagName('*').length,
    popovers: document.querySelectorAll('[popover]').length,
    open: document.querySelectorAll('[popover]:popover-open').length,
  }
}

function Panel() {
  const [, force] = useState(0)
  const worst = useRef({ desync: 0, broken: 0, nodes: 0 })

  useEffect(() => {
    const id = setInterval(() => {
      const state = readState()
      worst.current.nodes = Math.max(worst.current.nodes, state.nodes)
      for (const row of state.rows) {
        if (row.desync) worst.current.desync++
        if (row.descBroken) worst.current.broken++
      }
      force((n) => n + 1)
    }, 200)
    return () => clearInterval(id)
  }, [])

  const state = readState()

  return (
    <div className="sticky top-0 z-10 border-b border-line bg-subtle px-4 py-3 text-meta">
      <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono">
        <span>
          подписок добавлено: <b>{metrics.add}</b> / снято: <b>{metrics.rem}</b>
        </span>
        <span>
          из них toggle: <b>{metrics.toggleAdd}</b> / <b>{metrics.toggleRem}</b>
        </span>
        <span>
          узлов DOM: <b>{state.nodes}</b> (макс {worst.current.nodes})
        </span>
        <span>
          popover: <b>{state.popovers}</b>, открыто <b>{state.open}</b>
        </span>
        <span>
          рассинхрон aria: <b>{worst.current.desync}</b>
        </span>
        <span>
          битый activedescendant: <b>{worst.current.broken}</b>
        </span>
        <span>
          ошибок: <b>{metrics.errors}</b>
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 font-mono">
        {state.rows.map((row) => (
          <span key={row.i} className={row.desync ? 'text-danger-fg' : 'text-fg-muted'}>
            {row.name}: dom={String(row.open)} aria={String(row.aria)}
            {row.descBroken ? ' ⚠ activedescendant' : ''}
          </span>
        ))}
      </div>
      <p className="mt-2 mb-0 text-fg-muted">
        Счётчики «подписок» отсчитываются от загрузки страницы. Главное здесь не
        абсолютный баланс, а то, что при открытии и закрытии списка цифры стоят на месте:
        значит на каждое открытие никто не переподписывается. Расти они могут только при
        монтировании компонентов, причём в StrictMode React намеренно монтирует дважды —
        на каждый экземпляр выходит две подписки и одно снятие, и это не утечка.
      </p>
    </div>
  )
}

/** Серия синтетических кликов: проверяет, что обработчики не теряют такт. */
function storm(selector: string, times: number, gapMs: number) {
  const el = document.querySelector<HTMLElement>(selector)
  if (!el) return
  let n = 0
  const fire = () => {
    el.click()
    if (++n < times) {
      if (gapMs === 0) fire()
      else setTimeout(fire, gapMs)
    }
  }
  fire()
}

function Row({
  title,
  hint,
  children,
}: {
  title: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-2 border-b border-line px-4 py-5">
      <h2 className="m-0 text-ui font-semibold">{title}</h2>
      <p className="m-0 max-w-[70ch] text-meta text-fg-muted">{hint}</p>
      <div className="flex flex-wrap items-start gap-3 pt-1">{children}</div>
    </section>
  )
}

function MountStorm() {
  const [mounted, setMounted] = useState(true)
  const [cycles, setCycles] = useState(0)

  const run = async () => {
    const tick = () =>
      new Promise<void>((resolve) => {
        const channel = new MessageChannel()
        channel.port1.onmessage = () => resolve()
        channel.port2.postMessage(0)
      })
    for (let i = 0; i < 100; i++) {
      setMounted(false)
      await tick()
      await tick()
      setMounted(true)
      await tick()
      await tick()
      setCycles(i + 1)
    }
  }

  return (
    <>
      <Button size="sm" variant="quiet" onClick={run}>
        100 циклов mount/unmount ({cycles})
      </Button>
      {mounted && (
        <Select
          data-name="mount-storm"
          options={REGIONS.map((value) => ({ value, label: value }))}
          defaultValue="eu-west-1"
        />
      )}
    </>
  )
}

/* Проверка <Activity> из React 19.2: DOM создан, эффекты сняты, состояние живо.
   Heavy объявлен на уровне модуля — иначе на каждый рендер родителя это был бы
   новый тип компонента, и React пересоздавал бы поддерево вместо того, чтобы
   его сохранять. */
const activityRuns = { mounted: 0, unmounted: 0 }

function Heavy() {
  useEffect(() => {
    activityRuns.mounted++
    return () => {
      activityRuns.unmounted++
    }
  }, [])

  return (
    <div
      data-activity-body
      className="flex flex-col gap-2 rounded-md border border-line p-3"
    >
      <input
        defaultValue="напечатайте сюда, потом скройте"
        className="rounded-control border border-line bg-canvas px-2 py-1 text-ui"
      />
      <Calendar value="2026-03-20" />
    </div>
  )
}

function ActivityProbe() {
  const [visible, setVisible] = useState(false)
  const [, force] = useState(0)

  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 300)
    return () => clearInterval(id)
  }, [])

  const body = document.querySelector('[data-activity-body]')

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="quiet" onClick={() => setVisible((v) => !v)}>
          {visible ? 'Скрыть (mode="hidden")' : 'Показать (mode="visible")'}
        </Button>
        <span className="font-mono text-meta text-fg-muted">
          DOM: {String(!!body)} · display: {body ? getComputedStyle(body).display : '—'} ·
          эффекты смонтированы: {activityRuns.mounted}, сняты: {activityRuns.unmounted}{' '}
          (StrictMode удваивает)
        </span>
      </div>
      <Activity mode={visible ? 'visible' : 'hidden'}>
        <Heavy />
      </Activity>
    </div>
  )
}

/* Выравнивание — насколько бокс попадает в центр строки и в центр ячейки. */
function AlignProbe() {
  const [touch, setTouch] = useState(false)
  const [, force] = useState(0)

  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 400)
    return () => clearInterval(id)
  }, [])

  // Плотность объявлена на :root и .cx-root — на произвольной обёртке
  // переменные не переопределятся, поэтому атрибут ставится на документ.
  useEffect(() => {
    if (!touch) return
    document.documentElement.setAttribute('data-cx-density', 'touch')
    return () => document.documentElement.removeAttribute('data-cx-density')
  }, [touch])

  const measure = (selector: string) => {
    const host = document.querySelector(selector)
    const input = host?.querySelector('input')
    const text = host?.querySelector('[data-line]')
    if (!host || !input) return '—'
    const b = input.getBoundingClientRect()
    const target = (text ?? host).getBoundingClientRect()
    const delta = b.y + b.height / 2 - (target.y + target.height / 2)
    return `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}px`
  }

  return (
    <div data-cx-density={touch ? 'touch' : undefined} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="quiet" onClick={() => setTouch((t) => !t)}>
          {touch ? 'Плотность: touch' : 'Плотность: обычная'}
        </Button>
        <span className="font-mono text-meta text-fg-muted">
          смещение от центра: одна строка {measure('[data-probe=line]')} · две строки{' '}
          {measure('[data-probe=block]')} · items-center {measure('[data-probe=center]')}{' '}
          · в ячейке {measure('[data-probe=cell]')}
        </span>
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <span data-probe="line" className="inline-flex">
          <Checkbox label={<span data-line>Одна строка</span>} defaultChecked />
        </span>

        <span data-probe="block" className="inline-flex max-w-56">
          <Checkbox
            label={<span data-line>Метка с описанием</span>}
            description="Вторая строка, которая объясняет, что делает флажок"
          />
        </span>

        <span data-probe="center" className="inline-flex">
          <Checkbox
            className="items-center"
            label={<span data-line>items-center</span>}
          />
        </span>

        <span className="inline-flex">
          <Radio name="probe" label={<span>Radio</span>} defaultChecked />
        </span>

        <span className="inline-flex">
          <Toggle label="Toggle" defaultChecked />
        </span>
      </div>

      <table className="w-56 border border-line text-ui">
        <tbody>
          <tr>
            <td
              data-probe="cell"
              className="h-16 border border-line text-center align-middle"
            >
              <Checkbox defaultChecked />
            </td>
            <td className="border border-line px-2">
              Флажок без метки в ячейке: должен встать по центру
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function Stress() {
  const menu = usePopover()
  const calendar = usePopover()
  const deferred = usePopover()
  const [day, setDay] = useState('2026-03-20')

  return (
    <div className="min-h-dvh bg-canvas text-fg">
      <Panel />

      <Row
        title="1. Select — обычный"
        hint="Кликайте по триггеру как можно быстрее, зажмите двойной/тройной клик, подёргайте мышью. Счётчики подписок наверху не должны двигаться, dom и aria не должны расходиться дольше одного тика."
      >
        <div className="w-64">
          <Select
            data-name="select"
            options={REGIONS.map((value) => ({ value, label: value }))}
            defaultValue="eu-west-1"
          />
        </div>
        <Button
          size="sm"
          variant="quiet"
          onClick={() => storm('[data-name=select]', 50, 0)}
        >
          50 кликов подряд без пауз
        </Button>
        <Button
          size="sm"
          variant="quiet"
          onClick={() => storm('[data-name=select]', 50, 4)}
        >
          50 кликов по 4 мс
        </Button>
        <Button
          size="sm"
          variant="quiet"
          onClick={() => storm('[data-name=select]', 50, 16)}
        >
          50 кликов по 16 мс
        </Button>
      </Row>

      <Row
        title="2. Select с группами — активная опция после клика"
        hint="Откройте мышью, стрелкой вниз перейдите на другую опцию, нажмите Escape и откройте снова мышью: подсветка должна вернуться на выбранное значение. Первое открытие мышью должно вставать на первую настоящую опцию, а не на группу-заголовок, и Enter должен её выбирать."
      >
        <div className="w-64">
          <Select data-name="grouped" options={GROUPED} placeholder="Выберите регион" />
        </div>
      </Row>

      <Row
        title="3. Combobox — 12 значений"
        hint="Клик по полю должен открывать список, повторный клик внутрь поля — не закрывать его. Наберите заведомо несуществующее значение: список скажет «ничего не найдено», а счётчик «битый activedescendant» должен остаться нулём."
      >
        <div className="w-64">
          <Combobox data-name="combobox" options={REGIONS} defaultValue="" />
        </div>
      </Row>

      <Row
        title="4. Combobox — 2000 значений"
        hint="2000 значений, но список рисует не больше сотни и говорит об этом строкой внизу. Подержите стрелку вниз: подсветка двигается атрибутом, без ре-рендера, поэтому идёт ровно. Смотрите на «узлов DOM» — их теперь около трёхсот вместо шести тысяч."
      >
        <div className="w-64">
          <Combobox data-name="huge" options={HUGE} defaultValue="" />
        </div>
      </Row>

      <Row
        title="5. Меню в popover — целиком на платформе"
        hint="Здесь нет ни состояния, ни эффекта: открывает и закрывает браузер. Долбите по кнопке — счётчики стоят намертво."
      >
        <Button size="sm" {...menu.trigger}>
          Действия
        </Button>
        <Popover {...menu.content}>
          <Menu>
            <MenuItem>Открыть логи</MenuItem>
            <MenuItem>Перезапустить</MenuItem>
            <MenuItem variant="danger">Удалить</MenuItem>
          </Menu>
        </Popover>
      </Row>

      <Row
        title="6. Calendar в popover — тяжёлое содержимое"
        hint="Слева — как было: сетка месяца живёт в DOM всегда. Справа — тот же поповер с defer: содержимое лежит в скрытом <Activity>, React строит его заранее и сохраняет состояние между открытиями. Откройте, пролистайте месяц вперёд, закройте и откройте снова — месяц останется тот же."
      >
        <Button size="sm" variant="quiet" {...calendar.trigger}>
          {day} — обычный
        </Button>
        <Popover {...calendar.content}>
          <Calendar value={day} onValueChange={setDay} />
        </Popover>

        <Button size="sm" variant="quiet" {...deferred.trigger}>
          {day} — defer
        </Button>
        <Popover defer {...deferred.content}>
          <Calendar value={day} onValueChange={setDay} />
        </Popover>
      </Row>

      <Row
        title="9. Выравнивание Checkbox / Radio / Toggle"
        hint="Первые три числа — смещение центра бокса от центра строки метки, четвёртое — от центра ячейки; ноль это попадание, и всё в пределах пикселя. Бокс садится на базовую линию первой строки, поэтому попадает и при двух строках, и когда продукт передал items-center, и в touch-плотности, где сам бокс крупнее. Кнопка плотности переключает атрибут на корне страницы."
      >
        <AlignProbe />
      </Row>

      <Row
        title="8. <Activity> из React 19.2 — «html есть, но скрыт», средствами React"
        hint="Скройте и покажите: DOM остаётся на месте, React проставляет на него display: none, эффекты при скрытии снимаются, а состояние (введённый текст, выбранный месяц) переживает переключение. Первый показ уже готов — содержимое отрисовано заранее и с пониженным приоритетом."
      >
        <ActivityProbe />
      </Row>

      <Row
        title="7. Монтирование и размонтирование"
        hint="Единственное место, где счётчик подписок обязан расти. Важно, что растут обе цифры сразу: за 100 циклов «добавлено toggle» и «снято toggle» уходят вверх на одинаковую величину, а «узлов DOM» возвращается к исходному — значит размонтирование всё за собой убирает."
      >
        <MountStorm />
      </Row>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Stress />
  </StrictMode>,
)
