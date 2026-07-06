import { cva } from 'class-variance-authority';

export const tableVariants = cva(
  'w-full caption-bottom text-sm [&_tr]:border-b [&_tr]:border-border [&_tbody_tr:last-child]:border-0 [&_th]:h-10 [&_th]:px-2 [&_th]:text-left [&_th]:align-middle [&_th]:font-medium [&_th]:text-text-secondary [&_td]:p-2 [&_td]:align-middle [&_caption]:mt-4 [&_caption]:text-sm [&_caption]:text-text-secondary',
);
