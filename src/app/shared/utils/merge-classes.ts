import { clsx, type ClassValue } from 'clsx';

export function mergeClasses(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function noopFn(): void {}
