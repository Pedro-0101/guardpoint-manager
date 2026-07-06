import { cva } from 'class-variance-authority';

export const emptyVariants = cva('flex flex-col items-center justify-center py-12 text-center');

export const emptyIconVariants = cva('text-4xl text-muted-foreground mb-4 block');

export const emptyTitleVariants = cva('text-lg font-semibold text-foreground mb-1');

export const emptyDescriptionVariants = cva('text-sm text-muted-foreground max-w-md');
