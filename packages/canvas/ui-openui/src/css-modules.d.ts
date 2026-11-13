declare module '*.css'

/** One lucide icon module; the package's per-icon ESM files carry no declarations of their own. */
declare module 'lucide-react/dist/esm/icons/*.mjs' {
  import type { LucideIcon } from 'lucide-react'
  const icon: LucideIcon
  export default icon
}
