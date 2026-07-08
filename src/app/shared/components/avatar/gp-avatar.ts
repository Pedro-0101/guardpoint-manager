import { Component, computed, inject, input } from '@angular/core';

import { AvatarService } from '@/core/services/avatar.service';

export type AvatarSize = 'sm' | 'md' | 'lg';

const SIZE_MAP: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
};

@Component({
  selector: 'gp-avatar',
  templateUrl: './gp-avatar.html',
  styleUrl: './gp-avatar.scss',
})
export class GpAvatarComponent {
  private readonly avatarService = inject(AvatarService);

  readonly name = input.required<string>();
  readonly size = input<AvatarSize>('md');

  protected readonly avatar = computed(() => this.avatarService.getAvatar(this.name()));

  protected readonly sizeClass = computed(() => SIZE_MAP[this.size()]);
}
