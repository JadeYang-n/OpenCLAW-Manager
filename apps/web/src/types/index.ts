// 类型导出索引

export * from './api';
export * from './port-scanner';
export * from './instance-discovery';
export * from './token-blacklist';

/**
 * 通用工具类型
 */

/**
 * 使所有属性变为可选
 */
export type Partial<T> = {
  [P in keyof T]?: T[P];
};

/**
 * 使所有属性变为只读
 */
export type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

/**
 * 提取特定字段
 */
export type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

/**
 * 排除特定字段
 */
export type Omit<T, K extends keyof T> = {
  [P in Exclude<keyof T, K>]: T[P];
};

/**
 * 联合类型转交叉类型
 */
export type UnionToIntersection<U> = (
  U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

/**
 * 异步函数返回类型
 */
export type AsyncReturnType<T extends (...args: unknown[]) => unknown> = Promise<
  ReturnType<T>
>;

/**
 * 深度部分类型
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * 深度只读类型
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};
