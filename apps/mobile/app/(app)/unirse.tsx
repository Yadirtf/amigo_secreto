import { normalizeInviteCode } from '@entre-nos/domain';
import { Banner, Button, Screen, Text, TextField } from '@entre-nos/ui';
import { useEffect, useState } from 'react';
import { InvitePreviewCard } from '../../src/components/InvitePreviewCard';
import { goBack } from '../../src/components/states';
import { useInvitePreview } from '../../src/features/groups/hooks';
import { previewBlocker, useJoinFlow } from '../../src/features/groups/join';
import { errorMessage } from '../../src/lib/errors';
import { haptics } from '../../src/lib/haptics';
import { extractInviteCode, formatCodeInput, formatInviteCode } from '../../src/lib/invite';
import { readClipboard } from '../../src/lib/share';

/** S4 — Unirse con código (XXXXX-XXXXX). */
export default function JoinScreen() {
  const [input, setInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const raw = input.replace('-', '');
  const complete = raw.length === 10;
  const code = complete ? normalizeInviteCode(raw) : null;
  const preview = useInvitePreview(code);
  const flow = useJoinFlow();

  const invalidLocally = complete && !code;
  const fieldError = invalidLocally
    ? 'Ese código no existe. Revisa que esté bien escrito o pide el enlace de nuevo.'
    : preview.error
      ? errorMessage(preview.error, 'join')
      : null;

  useEffect(() => {
    if (fieldError) haptics.error();
  }, [fieldError]);

  const blocker = preview.data ? previewBlocker(preview.data) : null;
  const canJoin = !!code && !!preview.data && !blocker;

  const paste = async () => {
    const text = await readClipboard();
    const found = extractInviteCode(text);
    setJoinError(null);
    setInput(found ? formatInviteCode(found) : formatCodeInput(text));
  };

  return (
    <Screen
      testID="join-screen"
      topBar={{ title: 'Unirme a un grupo', onBack: goBack }}
      footer={
        <>
          {joinError ? <Banner kind="error" message={joinError} testID="join-error" /> : null}
          <Button
            label="Unirme a este grupo"
            loadingLabel="Uniéndote…"
            loading={flow.isPending}
            disabled={!canJoin}
            onPress={() => {
              if (!code || !preview.data) return;
              setJoinError(null);
              flow.run(code, preview.data, setJoinError);
            }}
            fullWidth
            testID="join-submit"
          />
        </>
      }
    >
      <Text variant="body">Escribe el código que te mandaron</Text>
      <TextField
        label="Código del grupo"
        variant="code"
        value={input}
        onChangeText={(t) => {
          setJoinError(null);
          const link = t.length > 14 ? extractInviteCode(t) : null;
          setInput(link ? formatInviteCode(link) : formatCodeInput(t));
        }}
        autoFocus
        maxLength={11}
        placeholder="XXXXX-XXXXX"
        helper="Son 10 letras y números."
        loading={preview.isFetching && !preview.data}
        loadingText="Buscando el grupo…"
        error={fieldError ?? blocker}
        returnKeyType="done"
        testID="join-code-input"
        helperAction={
          <Button
            variant="ghost"
            size="small"
            icon="paste"
            label="Pegar"
            accessibilityLabel="Pegar el código"
            onPress={() => void paste()}
            testID="join-paste"
          />
        }
      />
      {preview.data ? <InvitePreviewCard preview={preview.data} /> : null}
    </Screen>
  );
}
