import type { ChatSideName } from '../api/endpoints';

export const qk = {
  me: ['me'] as const,
  groups: ['groups'] as const,
  group: (id: string) => ['group', id] as const,
  assignment: (id: string) => ['assignment', id] as const,
  wishlist: (id: string) => ['wishlist', id] as const,
  chat: (id: string, side: ChatSideName) => ['chat', id, side] as const,
  reveal: (id: string) => ['reveal', id] as const,
  invite: (code: string) => ['invite', code] as const,
};

export const mutationKeys = {
  putWishlist: ['wishlist', 'put'] as const,
};

/** Non-sensitive data persisted in AsyncStorage for offline reading. */
export const PLAIN_PERSISTED = new Set(['me', 'groups', 'group', 'wishlist']);
/** Sensitive data: persisted only through SecureStore (see secureCache.ts). */
export const SECURE_PERSISTED = new Set(['assignment', 'reveal']);
