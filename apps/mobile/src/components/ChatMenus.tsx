import { BottomSheet, ConfirmDialog, ListRow, useToast } from '@entre-nos/ui';
import { useState } from 'react';
import type { ChatSideName } from '../api/endpoints';
import { useBlockChat, useReportMessage } from '../features/chat/hooks';
import { errorMessage } from '../lib/errors';
import { haptics } from '../lib/haptics';
import { ReportSheet } from './ChatView';

/** State + sheets for the chat ⋮ menu: report the thread, block/unblock (receiver side). */
export function useChatMenu(groupId: string, side: ChatSideName, groupName: string) {
  const toast = useToast();
  const block = useBlockChat(groupId);
  const report = useReportMessage(groupId, side);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockAsk, setBlockAsk] = useState(false);

  const element = (
    <>
      <BottomSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Opciones del chat"
        testID="chat-menu"
      >
        <ListRow
          icon="flag"
          title="Reportar"
          onPress={() => {
            setMenuOpen(false);
            setReportOpen(true);
          }}
          testID="chat-menu-report"
        />
        {side === 'receiver' ? (
          <ListRow
            icon="ban"
            title="Bloquear chat"
            onPress={() => {
              setMenuOpen(false);
              setBlockAsk(true);
            }}
            testID="chat-menu-block"
          />
        ) : null}
      </BottomSheet>
      {reportOpen ? (
        <ReportSheet
          busy={report.isPending}
          onClose={() => setReportOpen(false)}
          onSubmit={(reason) =>
            report.mutate(
              { messageId: null, reason },
              {
                onSuccess: () => {
                  setReportOpen(false);
                  toast.show('Gracias por avisar. Vamos a revisar el mensaje.');
                  if (side === 'receiver') setBlockAsk(true);
                },
                onError: (e) => toast.show({ message: errorMessage(e), kind: 'error' }),
              },
            )
          }
        />
      ) : null}
      <ConfirmDialog
        visible={blockAsk}
        title="¿Bloquear este chat?"
        message={`Ya no recibirás mensajes de esta persona en ${groupName}. El sorteo sigue igual y nadie se entera de que bloqueaste.`}
        confirmLabel="Bloquear chat"
        confirmLoadingLabel="Bloqueando…"
        cancelLabel="Cancelar"
        confirmVariant="destructive"
        loading={block.isPending}
        onCancel={() => setBlockAsk(false)}
        onConfirm={() =>
          block.mutate(true, {
            onSuccess: () => {
              haptics.success();
              setBlockAsk(false);
              toast.show('Bloqueaste este chat.');
            },
            onError: (e) => {
              setBlockAsk(false);
              toast.show({ message: errorMessage(e), kind: 'error' });
            },
          })
        }
        testID="dialog-block"
      />
    </>
  );

  return {
    open: () => setMenuOpen(true),
    askBlock: () => setBlockAsk(true),
    element,
  };
}
