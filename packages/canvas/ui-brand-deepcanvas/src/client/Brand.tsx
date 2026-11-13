import { useId } from 'react'

/** Product name drawn as the wordmark; a proper name, identical in every locale. */
const PRODUCT_NAME = 'DeepCanvas'

/** Square presentation props shared by the sidebar and hero brand seats. */
export interface DeepCanvasMarkProps {
  /** Square edge in pixels. */
  size?: number | undefined
  /** Host class preserving the surrounding mark geometry. */
  className?: string | undefined
}

/**
 * Render the DeepCanvas mark: a rounded canvas tile carrying three rising panels.
 * @param props - requested edge and host class.
 * @returns the mark svg (aria-hidden; the wordmark carries the accessible name).
 */
export function DeepCanvasMark({ size = 24, className }: DeepCanvasMarkProps) {
  const gradient = useId()
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradient} x1="3" y1="3" x2="29" y2="29" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4F7CFF" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="28" height="28" rx="8" fill={`url(#${gradient})`} />
      <rect x="8" y="17" width="4.2" height="7" rx="1.6" fill="#fff" fillOpacity="0.72" />
      <rect x="13.9" y="12.5" width="4.2" height="11.5" rx="1.6" fill="#fff" fillOpacity="0.86" />
      <rect x="19.8" y="8" width="4.2" height="16" rx="1.6" fill="#fff" />
    </svg>
  )
}

/**
 * Render the product name beside the independently slotted mark.
 * @returns the DeepCanvas wordmark text.
 */
export function DeepCanvasName() {
  return <span style={{ fontWeight: 650, letterSpacing: '-0.01em', fontSize: 15 }}>{PRODUCT_NAME}</span>
}
