import { cva, type VariantProps } from 'class-variance-authority';

export const selectVariants = cva(
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      zError: {
        true: 'border-destructive focus-visible:ring-destructive',
        false: '',
      },
    },
    defaultVariants: {
      zError: false,
    },
  },
);

export type ZardSelectVariants = VariantProps<typeof selectVariants>;
