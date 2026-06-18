import { useContext } from 'react'
import { Minus, Maximize2, Minimize2 } from 'lucide-react'
import { useWidgetStore } from '../store/widgetStore'
import { MinimizeContext } from './MinimizeContext'

export function WindowControls() {
  const animatedMinimize = useContext(MinimizeContext)
  const { minimize: storeMinimize, isExpanded, expand, collapse } = useWidgetStore()
  const minimize = animatedMinimize ?? storeMinimize

  return (
    <div className="hidden lg:flex items-center wc-btns">
      <button type="button" onClick={minimize} aria-label="Minimize" className="wc-btn">
        <Minus size={13} strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={isExpanded ? collapse : expand}
        aria-label={isExpanded ? 'Restore size' : 'Expand'}
        className="wc-btn"
      >
        {isExpanded ? <Minimize2 size={13} strokeWidth={2} /> : <Maximize2 size={13} strokeWidth={2} />}
      </button>
    </div>
  )
}
