import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { ThemeProvider, useTheme } from '../ThemeContext'

function ThemeProbe({ onReady }: { onReady: (api: ReturnType<typeof useTheme>) => void }) {
  const api = useTheme()
  onReady(api)
  return <div data-testid="theme">{api.theme}</div>
}

describe('ThemeContext', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.classList.remove('dark')
  })

  afterEach(() => {
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.classList.remove('dark')
  })

  it('defaults to dark when no preference is stored', () => {
    let captured: ReturnType<typeof useTheme> | null = null
    render(
      <ThemeProvider>
        <ThemeProbe onReady={(api) => { captured = api }} />
      </ThemeProvider>,
    )
    expect(captured!.theme).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('reads the stored theme on init', () => {
    window.localStorage.setItem('daimon.theme', 'light')
    let captured: ReturnType<typeof useTheme> | null = null
    render(
      <ThemeProvider>
        <ThemeProbe onReady={(api) => { captured = api }} />
      </ThemeProvider>,
    )
    expect(captured!.theme).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('toggleTheme flips the theme and persists it', () => {
    let captured: ReturnType<typeof useTheme> | null = null
    render(
      <ThemeProvider>
        <ThemeProbe onReady={(api) => { captured = api }} />
      </ThemeProvider>,
    )
    expect(captured!.theme).toBe('dark')

    act(() => captured!.toggleTheme())
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(window.localStorage.getItem('daimon.theme')).toBe('light')

    act(() => captured!.toggleTheme())
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('setTheme switches to the requested mode', () => {
    let captured: ReturnType<typeof useTheme> | null = null
    render(
      <ThemeProvider>
        <ThemeProbe onReady={(api) => { captured = api }} />
      </ThemeProvider>,
    )
    act(() => captured!.setTheme('light'))
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })
})
