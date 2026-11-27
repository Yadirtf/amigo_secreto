/**
 * Typed endpoint functions (docs/API.md). Every response is validated with
 * the shared contract schema.
 */
import {
  ChatMessage,
  ChatThread,
  GroupDetail,
  GroupList,
  InvitePreview,
  Me,
  MyAssignment,
  Ok,
  Reveal,
  Session,
  WishlistResponse,
  type CreateGroupRequest,
  type UpdateGroupRequest,
  type WishInput,
} from '@entre-nos/contracts';
import type { z } from 'zod';
import type { ApiClient } from './client';

export type ChatSideName = 'giver' | 'receiver';
export type ExclusionPair = [string, string];

const enc = encodeURIComponent;

export function createEndpoints(client: ApiClient) {
  return {
    auth: {
      google: (idToken: string) =>
        client.request('POST', '/v1/auth/google', {
          schema: Session,
          body: { idToken },
          auth: false,
        }),
      dev: (key: string, name: string) =>
        client.request('POST', '/v1/auth/dev', {
          schema: Session,
          body: { key, name },
          auth: false,
        }),
      refresh: (refreshToken: string) =>
        client.request('POST', '/v1/auth/refresh', {
          schema: Session,
          body: { refreshToken },
          auth: false,
        }),
      logout: (refreshToken: string, pushToken?: string) =>
        client.request('POST', '/v1/auth/logout', {
          schema: Ok,
          body: pushToken ? { refreshToken, pushToken } : { refreshToken },
        }),
    },
    me: {
      get: (signal?: AbortSignal) => client.request('GET', '/v1/me', { schema: Me, signal }),
      update: (body: { name?: string; photo?: string | null }) =>
        client.request('PATCH', '/v1/me', { schema: Me, body }),
      /** Requires a FRESH Google ID token (dev-login users on staging send {}). */
      delete: (idToken: string | null) =>
        client.request('DELETE', '/v1/me', { schema: Ok, body: idToken ? { idToken } : {} }),
      pushToken: (token: string) =>
        client.request('PUT', '/v1/me/push-token', { schema: Ok, body: { token } }),
    },
    groups: {
      list: (signal?: AbortSignal) =>
        client.request('GET', '/v1/groups', { schema: GroupList, signal }),
      get: (id: string, signal?: AbortSignal) =>
        client.request('GET', `/v1/groups/${enc(id)}`, { schema: GroupDetail, signal }),
      create: (body: CreateGroupRequest) =>
        client.request('POST', '/v1/groups', { schema: GroupDetail, body }),
      update: (id: string, body: UpdateGroupRequest) =>
        client.request('PATCH', `/v1/groups/${enc(id)}`, { schema: GroupDetail, body }),
      delete: (id: string) => client.request('DELETE', `/v1/groups/${enc(id)}`, { schema: Ok }),
      join: (code: string) =>
        client.request('POST', '/v1/groups/join', { schema: GroupDetail, body: { code } }),
      rotateInvite: (id: string) =>
        client.request('POST', `/v1/groups/${enc(id)}/invite/rotate`, { schema: GroupDetail }),
      removeMember: (id: string, userId: string) =>
        client.request('DELETE', `/v1/groups/${enc(id)}/members/${enc(userId)}`, { schema: Ok }),
      participation: (id: string, participates: boolean) =>
        client.request('PUT', `/v1/groups/${enc(id)}/participation`, {
          schema: GroupDetail,
          body: { participates },
        }),
      exclusions: (id: string, exclusions: ExclusionPair[]) =>
        client.request('PUT', `/v1/groups/${enc(id)}/exclusions`, {
          schema: GroupDetail,
          body: { exclusions },
        }),
      draw: (id: string) =>
        client.request('POST', `/v1/groups/${enc(id)}/draw`, { schema: GroupDetail }),
      redraw: (id: string) =>
        client.request('POST', `/v1/groups/${enc(id)}/redraw`, {
          schema: GroupDetail,
          body: { confirm: true },
        }),
      reopen: (id: string) =>
        client.request('POST', `/v1/groups/${enc(id)}/reopen`, {
          schema: GroupDetail,
          body: { confirm: true },
        }),
      reveal: (id: string) =>
        client.request('POST', `/v1/groups/${enc(id)}/reveal`, {
          schema: GroupDetail,
          body: { confirm: true },
        }),
      getReveal: (id: string, signal?: AbortSignal) =>
        client.request('GET', `/v1/groups/${enc(id)}/reveal`, { schema: Reveal, signal }),
      assignment: (id: string, signal?: AbortSignal) =>
        client.request('GET', `/v1/groups/${enc(id)}/assignment`, { schema: MyAssignment, signal }),
    },
    invites: {
      preview: (code: string, signal?: AbortSignal) =>
        client.request('GET', `/v1/invites/${enc(code)}`, { schema: InvitePreview, signal }),
    },
    wishlist: {
      get: (groupId: string, signal?: AbortSignal) =>
        client.request('GET', `/v1/groups/${enc(groupId)}/wishlist`, {
          schema: WishlistResponse,
          signal,
        }),
      put: (groupId: string, items: WishInput[]) =>
        client.request('PUT', `/v1/groups/${enc(groupId)}/wishlist`, {
          schema: WishlistResponse,
          body: { items },
        }),
    },
    chat: {
      thread: (
        groupId: string,
        side: ChatSideName,
        query: { limit?: number; before?: string } = {},
        signal?: AbortSignal,
      ) =>
        client.request('GET', `/v1/groups/${enc(groupId)}/chat/${side}`, {
          schema: ChatThread,
          query,
          signal,
        }),
      send: (groupId: string, side: ChatSideName, text: string) =>
        client.request('POST', `/v1/groups/${enc(groupId)}/chat/${side}/messages`, {
          schema: ChatMessage,
          body: { text },
        }),
      block: (groupId: string, blocked: boolean) =>
        client.request('PUT', `/v1/groups/${enc(groupId)}/chat/receiver/block`, {
          schema: Ok,
          body: { blocked },
        }),
      report: (groupId: string, side: ChatSideName, messageId: string | null, reason: string) =>
        client.request('POST', `/v1/groups/${enc(groupId)}/chat/${side}/report`, {
          schema: Ok,
          body: { messageId, reason },
        }),
    },
  };
}

export type Endpoints = ReturnType<typeof createEndpoints>;
export type SessionData = z.infer<typeof Session>;
