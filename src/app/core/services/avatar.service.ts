import { Injectable } from '@angular/core';

export interface AvatarData {
  initials: string;
  backgroundColor: string;
}

const AVATAR_COLORS = [
  '#2563EB',
  '#DC2626',
  '#CA8A04',
  '#16A34A',
  '#EA580C',
  '#0891B2',
  '#7C3AED',
  '#DB2777',
  '#0D9488',
  '#4F46E5',
  '#059669',
  '#D97706',
  '#9333EA',
  '#E11D48',
  '#0284C7',
  '#65A30D',
];

@Injectable({ providedIn: 'root' })
export class AvatarService {
  getAvatar(name: string): AvatarData {
    const trimmed = (name ?? '').trim();

    if (!trimmed) {
      return { initials: '?', backgroundColor: '#6B7280' };
    }

    const parts = trimmed.split(/\s+/).filter(Boolean);
    const initials = this.computeInitials(parts);
    const backgroundColor = this.computeColor(trimmed);

    return { initials, backgroundColor };
  }

  private computeInitials(parts: string[]): string {
    if (parts.length >= 2) {
      const first = this.firstChar(parts[0]);
      const last = this.firstChar(parts[parts.length - 1]);
      return `${first}${last}`.toUpperCase();
    }

    const name = parts[0];
    const first = this.firstChar(name);

    if (name.length === 1) {
      return first.toUpperCase();
    }

    const middleIndex = Math.floor(name.length / 2);
    const middle = name[middleIndex];

    return `${first}${middle}`.toUpperCase();
  }

  private firstChar(str: string): string {
    return str.charAt(0);
  }

  private computeColor(name: string): string {
    const hash = this.hashString(name.toLowerCase());
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}
