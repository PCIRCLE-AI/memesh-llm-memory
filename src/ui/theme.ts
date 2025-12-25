/**
 * Terminal UI Theme System
 * Based on the design system in docs/design/DESIGN_SYSTEM.md
 */

export const colors = {
  // Brand Colors - Purple Gradient
  primary: {
    light: '#8b9dc3',
    main: '#667eea',
    dark: '#5568d3',
    darker: '#764ba2',
  },

  // Semantic Colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  // Neutral Colors
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },

  // Text Colors
  text: {
    primary: '#f9fafb',
    secondary: '#d1d5db',
    muted: '#9ca3af',
    inverse: '#111827',
  },

  // Background Colors
  background: {
    primary: '#111827',
    secondary: '#1f2937',
    tertiary: '#374151',
  },
} as const;

export const typography = {
  // Font Family
  fontFamily: 'SF Mono, Monaco, Consolas, monospace',

  // Font Sizes (6-size scale)
  fontSize: {
    xs: '10px',
    sm: '12px',
    base: '14px',
    lg: '16px',
    xl: '20px',
    '2xl': '28px',
  },

  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const spacing = {
  // 8pt Grid System
  0: 0,
  1: 4,   // 0.5 × 8pt
  2: 8,   // 1 × 8pt
  3: 12,  // 1.5 × 8pt
  4: 16,  // 2 × 8pt
  5: 24,  // 3 × 8pt
  6: 32,  // 4 × 8pt
  7: 48,  // 6 × 8pt
  8: 64,  // 8 × 8pt
} as const;

export const icons = {
  // Status Indicators
  success: '✓',
  error: '✗',
  warning: '⚠',
  info: 'ℹ',
  pending: '○',
  inProgress: '◐',

  // Actions
  play: '▶',
  pause: '⏸',
  stop: '⏹',
  refresh: '↻',

  // Navigation
  arrowRight: '→',
  arrowLeft: '←',
  arrowUp: '↑',
  arrowDown: '↓',

  // Files
  file: '📄',
  folder: '📁',
  code: '💻',

  // Tools
  settings: '⚙',
  search: '🔍',
  filter: '⏺',

  // Misc
  star: '⭐',
  check: '✓',
  cross: '✗',
  bullet: '•',
  chevronRight: '›',
  chevronDown: '∨',
} as const;

export const borders = {
  // Box Drawing Characters
  light: {
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    horizontal: '─',
    vertical: '│',
    cross: '┼',
    teeLeft: '├',
    teeRight: '┤',
    teeTop: '┬',
    teeBottom: '┴',
  },

  heavy: {
    topLeft: '┏',
    topRight: '┓',
    bottomLeft: '┗',
    bottomRight: '┛',
    horizontal: '━',
    vertical: '┃',
    cross: '╋',
    teeLeft: '┣',
    teeRight: '┫',
    teeTop: '┳',
    teeBottom: '┻',
  },

  double: {
    topLeft: '╔',
    topRight: '╗',
    bottomLeft: '╚',
    bottomRight: '╝',
    horizontal: '═',
    vertical: '║',
    cross: '╬',
    teeLeft: '╠',
    teeRight: '╣',
    teeTop: '╦',
    teeBottom: '╩',
  },
} as const;

export const animation = {
  // Duration
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },

  // Spinners
  spinners: {
    dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
    line: ['|', '/', '-', '\\'],
    arrow: ['←', '↖', '↑', '↗', '→', '↘', '↓', '↙'],
    circle: ['◐', '◓', '◑', '◒'],
  },
} as const;

// Theme export
export const theme = {
  colors,
  typography,
  spacing,
  icons,
  borders,
  animation,
} as const;

export type Theme = typeof theme;
