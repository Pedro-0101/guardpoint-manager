import { clsx, type ClassValue } from 'clsx';

export function mergeClasses(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
