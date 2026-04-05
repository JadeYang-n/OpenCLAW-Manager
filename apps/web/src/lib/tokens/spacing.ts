// Design Token: Spacing
// Reference: OpenCLAW Manager 开发文档 v5.2 - 设计系统规范

export const spacing = {
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
} as const;

export type SpacingKey = keyof typeof spacing;
