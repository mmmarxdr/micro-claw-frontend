export const IS_MAC =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || '')

export const MOD = IS_MAC ? '⌘' : 'Ctrl'
export const ENTER = '↵'
