// Apple Design System Color Tokens
export const colors = {
  // Brand & Accent
  primary: '#0066cc',
  'primary-focus': '#0071e3',
  'primary-on-dark': '#2997ff',

  // Surface
  canvas: '#ffffff',
  'canvas-parchment': '#f5f5f7',
  'surface-pearl': '#fafafc',
  'surface-tile-1': '#272729',
  'surface-tile-2': '#2a2a2c',
  'surface-tile-3': '#252527',
  'surface-black': '#000000',
  'surface-chip-translucent': '#d2d2d7',

  // Text
  ink: '#1d1d1f',
  body: '#1d1d1f',
  'body-on-dark': '#ffffff',
  'body-muted': '#cccccc',
  'ink-muted-80': '#333333',
  'ink-muted-48': '#7a7a7a',

  // Borders
  'divider-soft': '#f0f0f0',
  hairline: '#e0e0e0',

  // Action
  'on-primary': '#ffffff',
  'on-dark': '#ffffff',

  // Semantic
  success: '#34c759',
  warning: '#ff9500',
  danger: '#ff3b30',
};

// Typography
export const typography = {
  'hero-display': {
    fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif',
    fontSize: '56px',
    fontWeight: '600',
    lineHeight: '1.07',
    letterSpacing: '-0.28px',
  },
  'display-lg': {
    fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif',
    fontSize: '40px',
    fontWeight: '600',
    lineHeight: '1.1',
    letterSpacing: '0',
  },
  'display-md': {
    fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
    fontSize: '34px',
    fontWeight: '600',
    lineHeight: '1.47',
    letterSpacing: '-0.374px',
  },
  lead: {
    fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif',
    fontSize: '28px',
    fontWeight: '400',
    lineHeight: '1.14',
    letterSpacing: '0.196px',
  },
  'lead-airy': {
    fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
    fontSize: '24px',
    fontWeight: '300',
    lineHeight: '1.5',
    letterSpacing: '0',
  },
  tagline: {
    fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif',
    fontSize: '21px',
    fontWeight: '600',
    lineHeight: '1.19',
    letterSpacing: '0.231px',
  },
  'body-strong': {
    fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
    fontSize: '17px',
    fontWeight: '600',
    lineHeight: '1.24',
    letterSpacing: '-0.374px',
  },
  body: {
    fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
    fontSize: '17px',
    fontWeight: '400',
    lineHeight: '1.47',
    letterSpacing: '-0.374px',
  },
  caption: {
    fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
    fontSize: '14px',
    fontWeight: '400',
    lineHeight: '1.43',
    letterSpacing: '-0.224px',
  },
  'caption-strong': {
    fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
    fontSize: '14px',
    fontWeight: '600',
    lineHeight: '1.29',
    letterSpacing: '-0.224px',
  },
  'button-large': {
    fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
    fontSize: '18px',
    fontWeight: '300',
    lineHeight: '1.0',
    letterSpacing: '0',
  },
  'button-utility': {
    fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
    fontSize: '14px',
    fontWeight: '400',
    lineHeight: '1.29',
    letterSpacing: '-0.224px',
  },
  'fine-print': {
    fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
    fontSize: '12px',
    fontWeight: '400',
    lineHeight: '1.0',
    letterSpacing: '-0.12px',
  },
  'nav-link': {
    fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
    fontSize: '12px',
    fontWeight: '400',
    lineHeight: '1.0',
    letterSpacing: '-0.12px',
  },
};

// Spacing
export const spacing = {
  xxs: '4px',
  xs: '8px',
  sm: '12px',
  md: '17px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
  section: '80px',
};

// Border Radius
export const rounded = {
  none: '0px',
  xs: '5px',
  sm: '8px',
  md: '11px',
  lg: '18px',
  pill: '9999px',
  full: '9999px',
};

// Shadows
export const shadows = {
  'product-shadow': 'rgba(0, 0, 0, 0.22) 3px 5px 30px 0',
};

// Global Styles
export const globalStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html {
    scroll-behavior: smooth;
  }

  body {
    font-family: ${typography.body.fontFamily};
    font-size: ${typography.body.fontSize};
    line-height: ${typography.body.lineHeight};
    letter-spacing: ${typography.body.letterSpacing};
    color: ${colors.ink};
    background-color: ${colors['canvas-parchment']};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  ::selection {
    background-color: ${colors.primary};
    color: ${colors['on-primary']};
  }

  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${colors['canvas-parchment']};
  }

  ::-webkit-scrollbar-thumb {
    background: ${colors['ink-muted-48']};
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${colors['ink-muted-80']};
  }

  input:focus,
  select:focus,
  textarea:focus,
  button:focus {
    outline: 2px solid ${colors['primary-focus']};
    outline-offset: 2px;
  }

  button:active {
    transform: scale(0.95);
  }
`;
