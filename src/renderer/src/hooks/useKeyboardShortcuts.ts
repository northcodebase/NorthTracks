import { useEffect } from 'react'

interface KeyboardShortcutsProps {
  onPlayPause: () => void
  onNext: () => void
  onPrev: () => void
  onVolumeUp: () => void
  onVolumeDown: () => void
  onMute: () => void
  onSeekForward: () => void   // +10 seconds
  onSeekBackward: () => void  // -10 seconds
  onLike: () => void
  onShowHelp?: () => void
  isEnabled: boolean  // false when user is typing in an input
}

export function useKeyboardShortcuts(props: KeyboardShortcutsProps) {
  useEffect(() => {
    if (!props.isEnabled) return

    const handler = (e: KeyboardEvent) => {
      // Never fire when typing in input, textarea, 
      // contenteditable, or select
      const target = e.target as HTMLElement
      if (
        !target ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) return

      // Never fire if modifier keys held (except shift for some)
      if (e.ctrlKey || e.altKey || e.metaKey) return

      switch (e.key) {
        case ' ':                    // Space = Play/Pause
          e.preventDefault()
          props.onPlayPause()
          break
        case 'ArrowRight':           // → = Seek +10s
          e.preventDefault()
          props.onSeekForward()
          break
        case 'ArrowLeft':            // ← = Seek -10s
          e.preventDefault()
          props.onSeekBackward()
          break
        case 'ArrowUp':              // ↑ = Volume +5%
          e.preventDefault()
          props.onVolumeUp()
          break
        case 'ArrowDown':            // ↓ = Volume -5%
          e.preventDefault()
          props.onVolumeDown()
          break
        case 'n':                    // N = Next track
        case 'N':
          props.onNext()
          break
        case 'p':                    // P = Previous track
        case 'P':
          props.onPrev()
          break
        case 'm':                    // M = Mute toggle
        case 'M':
          props.onMute()
          break
        case 'l':                    // L = Like toggle
        case 'L':
          props.onLike()
          break
        case '?':                    // ? = Show help modal
          props.onShowHelp?.()
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [props])
}
