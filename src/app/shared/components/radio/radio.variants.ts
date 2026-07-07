import { cva, type VariantProps } from 'class-variance-authority';

export const radioVariants = cva(
  'relative flex h-4 w-4 shrink-0 rounded-full border border-primary text-primary disabled:cursor-not-allowed disabled:opacity-50',
);

export type ZardRadioVariants = VariantProps<typeof radioVariants>;
