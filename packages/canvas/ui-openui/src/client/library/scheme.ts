import { useEffect, useState, type RefObject } from 'react'

/**
 * Follow the color scheme an element renders in.
 * @param ref - the element to read.
 * @returns "dark" when the element's used color-scheme is dark, else "light".
 */
export function useColorScheme(ref: RefObject<HTMLElement | null>): 'light' | 'dark' {
  const [scheme, setScheme] = useState<'light' | 'dark'>('light')
  useEffect(() => {
    const read = () => {
      const value = ref.current ? getComputedStyle(ref.current).colorScheme : ''
      setScheme(value.trim() === 'dark' ? 'dark' : 'light')
    }
    read()
    // Theme switches flip a theme attribute on the document or the body.
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ['data-theme', 'data-ds-dark-theme'] })
    return () =>{  observer.disconnect() }
  }, [ref])
  return scheme
}
