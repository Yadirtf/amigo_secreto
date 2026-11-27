import type { ChatMessage, ChatThread } from '@entre-nos/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { create } from 'zustand';
import { api } from '../../api';
import type { ChatSideName } from '../../api/endpoints';
import { qk } from '../../query/keys';

export const CHAT_POLL_MS = 15_000;
const PAGE = 30;

/**
 * The latest page of a thread. Polls every 15 s only while the chat screen
 * is focused; TanStack pauses it in the background (focusManager) and
 * offline (onlineManager). Chat is never persisted to disk.
 */
export function useChatThread(groupId: string, side: ChatSideName, enabled = true) {
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  return useQuery({
    queryKey: qk.chat(groupId, side),
    queryFn: ({ signal }) => api.chat.thread(groupId, side, { limit: PAGE }, signal),
    enabled,
    staleTime: 10_000,
    gcTime: 10 * 60_000,
    refetchInterval: focused ? CHAT_POLL_MS : false,
    refetchIntervalInBackground: false,
  });
}

/** Older pages, fetched on demand ("Ver mensajes anteriores"). */
export function useOlderMessages(groupId: string, side: ChatSideName) {
  const [older, setOlder] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const load = async (oldestCreatedAt: string) => {
    setLoading(true);
    try {
      const page = await api.chat.thread(groupId, side, { limit: PAGE, before: oldestCreatedAt });
      setOlder((prev) => [...page.messages, ...prev]);
      setHasMore(page.hasMore);
    } finally {
      setLoading(false);
    }
  };
  return { older, hasMore, loading, load };
}

export interface OutboxItem {
  tempId: string;
  text: string;
  status: 'sending' | 'failed';
  createdAt: string;
}

interface OutboxState {
  items: Record<string, OutboxItem[]>;
  put: (thread: string, item: OutboxItem) => void;
  patch: (thread: string, tempId: string, status: OutboxItem['status']) => void;
  remove: (thread: string, tempId: string) => void;
}

/** In-memory outbox: optimistic bubbles while sending, failed ones to retry. */
const useOutbox = create<OutboxState>((set) => ({
  items: {},
  put: (thread, item) =>
    set((s) => ({ items: { ...s.items, [thread]: [...(s.items[thread] ?? []), item] } })),
  patch: (thread, tempId, status) =>
    set((s) => ({
      items: {
        ...s.items,
        [thread]: (s.items[thread] ?? []).map((i) => (i.tempId === tempId ? { ...i, status } : i)),
      },
    })),
  remove: (thread, tempId) =>
    set((s) => ({
      items: { ...s.items, [thread]: (s.items[thread] ?? []).filter((i) => i.tempId !== tempId) },
    })),
}));

const EMPTY: OutboxItem[] = [];

export function useSendMessage(groupId: string, side: ChatSideName) {
  const client = useQueryClient();
  const thread = `${groupId}:${side}`;
  const outbox = useOutbox((s) => s.items[thread] ?? EMPTY);
  const { put, patch, remove } = useOutbox.getState();

  const deliver = async (item: OutboxItem) => {
    patch(thread, item.tempId, 'sending');
    try {
      const msg = await api.chat.send(groupId, side, item.text);
      client.setQueryData<ChatThread>(qk.chat(groupId, side), (old) =>
        old && !old.messages.some((m) => m.id === msg.id)
          ? { ...old, messages: [...old.messages, msg] }
          : old,
      );
      remove(thread, item.tempId);
      return true;
    } catch {
      patch(thread, item.tempId, 'failed');
      return false;
    }
  };

  const send = (text: string) => {
    const item: OutboxItem = {
      tempId: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text,
      status: 'sending',
      createdAt: new Date().toISOString(),
    };
    put(thread, item);
    return deliver(item);
  };

  return { outbox, send, retry: deliver };
}

export function useBlockChat(groupId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (blocked: boolean) => api.chat.block(groupId, blocked),
    networkMode: 'online',
    onSuccess: (_ok, blocked) => {
      client.setQueryData<ChatThread>(qk.chat(groupId, 'receiver'), (old) =>
        old ? { ...old, blocked } : old,
      );
    },
  });
}

export function useReportMessage(groupId: string, side: ChatSideName) {
  return useMutation({
    mutationFn: (v: { messageId: string | null; reason: string }) =>
      api.chat.report(groupId, side, v.messageId, v.reason),
    networkMode: 'online',
  });
}
