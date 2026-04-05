// Design Token: Border Radius
// Reference: OpenCLAW Manager 开发文档 v5.2 - 设计系统规范

export const radii = {
  sm: '4px',        // Small buttons, badges
  default: '6px',   // Cards, inputs, selects
  lg: '8px',        // Modals, popovers
  xl: '12px',       // Dialogs, panels
  full: '9999px',   // Circular badges, pills
} as const;

export type RadiusKey = keyof typeof radii;
