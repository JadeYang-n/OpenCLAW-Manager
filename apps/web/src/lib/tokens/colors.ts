// Design Token: Colors
// Reference: OpenCLAW Manager 开发文档 v5.2 - 设计系统规范

export const colors = {
  // Primary Colors
  primary: '#2563EB',        // hue: 217, saturation: 89%, lightness: 53%
  primaryHover: '#1D4ED8',
  primaryForeground: '#FFFFFF',

  // Success Colors
  success: '#16A34A',        // hue: 142, saturation: 75%, lightness: 45%
  successHover: '#15803D',
  successForeground: '#FFFFFF',

  // Warning Colors
  warning: '#D97706',        // hue: 42, saturation: 100%, lightness: 46%
  warningHover: '#B45309',
  warningForeground: '#FFFFFF',

  // Error Colors
  error: '#DC2626',          // hue: 0, saturation: 84%, lightness: 55%
  errorHover: '#B91C1C',
  errorForeground: '#FFFFFF',

  // Neutral Colors (Light Mode)
  background: '#F9FAFB',
  foreground: '#1F2937',
  muted: '#F3F4F6',
  mutedForeground: '#6B7280',
  accent: '#F3F4F6',
  accentForeground: '#1F2937',
  border: '#E5E7EB',
  input: '#E5E7EB',
  ring: '#2563EB',

  // Dark Mode Colors
  darkBackground: '#111827',
  darkForeground: '#F9FAFB',
  darkMuted: '#1F2937',
  darkBorder: '#374151',
  darkInput: '#374151',

  // Role-specific Colors
  admin: '#DC2626',          // Red
  operator: '#2563EB',       // Blue
  dept_admin: '#16A34A',     // Green
  employee: '#6B7280',       // Gray
  auditor: '#D97706',        // Orange
} as const;

export type ColorKey = keyof typeof colors;
