import type { Wish } from '@entre-nos/contracts';
import {
  BottomSheet,
  Button,
  Chip,
  EmptyState,
  ListRow,
  Screen,
  SkeletonCard,
  SkeletonGroup,
  Text,
  TextField,
  useTheme,
  useToast,
} from '@entre-nos/ui';
import { useLocalSearchParams } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';
import { goBack, LoadError, OfflineBanner } from '../../../../src/components/states';
import { WishCard } from '../../../../src/components/WishCard';
import { useGroup } from '../../../../src/features/groups/hooks';
import { useWishlist, useWishlistEditor } from '../../../../src/features/wishlist/hooks';
import { errorMessage } from '../../../../src/lib/errors';
import { formatCop } from '../../../../src/lib/format';
import { haptics } from '../../../../src/lib/haptics';
import { normalizeWishLink } from '../../../../src/lib/links';

const MAX_ITEMS = 20;
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;

/** S9 — Mi lista de deseos (per group). */
export default function WishlistScreen() {
  const theme = useTheme();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: g } = useGroup(id);
  const list = useWishlist(id);
  const editor = useWishlistEditor(id, (e) => {
    haptics.error();
    toast.show({ message: errorMessage(e, 'wishlist'), kind: 'error' });
  });
  const [sheet, setSheet] = useState<{ editing: Wish | null } | null>(null);
  const [menuFor, setMenuFor] = useState<Wish | null>(null);

  const items = list.data?.items ?? [];
  const full = items.length >= MAX_ITEMS;
  const caption =
    g?.budgetCop != null
      ? `Tu amigo secreto la ve. Ideas dentro de ${formatCop(g.budgetCop)}.`
      : 'Tu amigo secreto la ve.';

  const removeWish = (w: Wish) => {
    const before = editor.current();
    editor.remove(w.id);
    toast.show({
      message: 'Idea eliminada',
      action: { label: 'Deshacer', onPress: () => editor.restore(before) },
    });
  };

  let body: React.ReactNode;
  if (!list.data) {
    body = list.error ? (
      <LoadError error={list.error} onRetry={() => void list.refetch()} />
    ) : (
      <SkeletonGroup testID="loading">
        <SkeletonCard />
        <SkeletonCard />
      </SkeletonGroup>
    );
  } else if (items.length === 0) {
    body = (
      <EmptyState
        icon="wishlist"
        title="Ayúdale a tu amigo secreto"
        body="Agrega 2 o 3 ideas de lo que te gustaría. Así nadie te regala otra taza."
        primary={{
          label: 'Agregar mi primera idea',
          icon: 'plus',
          onPress: () => setSheet({ editing: null }),
          testID: 'wishlist-add-first',
        }}
        testID="wishlist-empty"
      />
    );
  } else {
    body = (
      <View style={{ gap: theme.space.sm }} testID="wishlist-items">
        {items.map((w, i) => (
          <WishCard key={w.id} wish={w} onMore={() => setMenuFor(w)} testID={`wish-${i}`} />
        ))}
        {full ? (
          <Text variant="caption" color="textSecondary" align="center">
            Llegaste al máximo de 20 ideas.
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <Screen
      testID="wishlist-screen"
      topBar={{ title: 'Mi lista de deseos', onBack: goBack }}
      footer={
        items.length > 0 ? (
          <Button
            label="Agregar idea"
            icon="plus"
            onPress={() => setSheet({ editing: null })}
            disabled={full}
            fullWidth
            testID="wishlist-add"
          />
        ) : undefined
      }
    >
      <OfflineBanner hasData={!!list.data} />
      <Text variant="caption" color="textSecondary">
        {caption}
      </Text>
      {body}

      <WishSheet
        visible={sheet !== null}
        editing={sheet?.editing ?? null}
        onClose={() => setSheet(null)}
        onSave={(w, editing) => {
          if (editing) {
            editor.update({ ...w, id: editing.id });
            haptics.success();
            toast.show('Cambios guardados');
            setSheet(null);
          } else {
            editor.add(w);
            haptics.success();
            toast.show('Idea guardada. ¿Otra?');
            if (editor.current().length >= MAX_ITEMS) setSheet(null);
          }
        }}
      />

      <BottomSheet
        visible={menuFor !== null}
        onClose={() => setMenuFor(null)}
        title={menuFor?.text ?? ''}
        testID="wish-menu"
      >
        <ListRow
          icon="edit"
          title="Editar"
          onPress={() => {
            const w = menuFor;
            setMenuFor(null);
            if (w) setSheet({ editing: w });
          }}
          testID="wish-edit"
        />
        <ListRow
          icon="trash"
          title="Eliminar"
          onPress={() => {
            const w = menuFor;
            setMenuFor(null);
            if (w) removeWish(w);
          }}
          testID="wish-delete"
        />
      </BottomSheet>
    </Screen>
  );
}

interface WishSheetProps {
  visible: boolean;
  editing: Wish | null;
  onClose: () => void;
  onSave: (w: Omit<Wish, 'id'>, editing: Wish | null) => void;
}

function WishSheet({ visible, editing, onClose, onSave }: WishSheetProps) {
  return visible ? (
    <WishForm key={editing?.id ?? 'new'} editing={editing} onClose={onClose} onSave={onSave} />
  ) : null;
}

function WishForm({ editing, onClose, onSave }: Omit<WishSheetProps, 'visible'>) {
  const theme = useTheme();
  const initialSize = editing?.size ?? null;
  const isPreset = (s: string | null) => s !== null && (SIZES as readonly string[]).includes(s);
  const [text, setText] = useState(editing?.text ?? '');
  const [size, setSize] = useState<string | null>(
    isPreset(initialSize) ? initialSize : initialSize ? 'other' : null,
  );
  const [otherSize, setOtherSize] = useState(isPreset(initialSize) ? '' : (initialSize ?? ''));
  const [link, setLink] = useState(editing?.link ?? '');
  const [textError, setTextError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const textRef = useRef<ComponentRef<typeof TextInput>>(null);
  const linkRef = useRef<ComponentRef<typeof TextInput>>(null);

  const reset = () => {
    setText('');
    setSize(null);
    setOtherSize('');
    setLink('');
    textRef.current?.focus();
  };

  const submit = () => {
    const idea = text.trim();
    let ok = true;
    if (idea === '') {
      setTextError('Escribe qué te gustaría, aunque sea una pista.');
      ok = false;
    }
    let normalized: string | null = null;
    try {
      normalized = normalizeWishLink(link);
    } catch {
      setLinkError(
        'Ese enlace no parece válido. Cópialo completo desde el navegador o la app de la tienda.',
      );
      ok = false;
    }
    if (!ok) {
      haptics.error();
      return;
    }
    const finalSize = size === 'other' ? otherSize.trim() || null : size;
    onSave({ text: idea, size: finalSize, link: normalized }, editing);
    if (!editing) reset();
  };

  return (
    <BottomSheet
      visible
      onClose={onClose}
      title={editing ? 'Editar idea' : 'Nueva idea'}
      testID="wish-sheet"
      footer={
        <>
          <Button
            label={editing ? 'Guardar cambios' : 'Guardar idea'}
            onPress={submit}
            fullWidth
            testID="wish-save"
          />
          {!editing ? (
            <Button variant="ghost" label="Listo" onPress={onClose} fullWidth testID="wish-done" />
          ) : null}
        </>
      }
    >
      <TextField
        ref={textRef}
        label="¿Qué te gustaría?"
        placeholder="Ej: Un libro de cocina"
        value={text}
        onChangeText={(t) => {
          setText(t);
          setTextError(null);
        }}
        error={textError}
        autoFocus
        maxLength={80}
        autoCapitalize="sentences"
        returnKeyType="next"
        onSubmitEditing={() => linkRef.current?.focus()}
        testID="wish-text"
      />
      <View style={{ gap: theme.space.sm }}>
        <Text variant="label" color="textSecondary">
          Talla (opcional)
        </Text>
        <View style={[styles.chips, { gap: theme.space.sm }]} accessibilityRole="radiogroup">
          {SIZES.map((s) => (
            <Chip
              key={s}
              label={s}
              role="radio"
              selected={size === s}
              onPress={() => {
                haptics.selection();
                setSize(size === s ? null : s);
              }}
              testID={`wish-size-${s}`}
            />
          ))}
          <Chip
            label="Otra"
            role="radio"
            selected={size === 'other'}
            onPress={() => {
              haptics.selection();
              setSize(size === 'other' ? null : 'other');
            }}
            testID="wish-size-other"
          />
        </View>
        {size === 'other' ? (
          <TextField
            label="¿Cuál talla?"
            placeholder="Ej: 38 de zapato"
            value={otherSize}
            onChangeText={setOtherSize}
            maxLength={30}
            testID="wish-size-custom"
          />
        ) : null}
      </View>
      <TextField
        ref={linkRef}
        label="Enlace (opcional)"
        variant="url"
        placeholder="https://"
        value={link}
        onChangeText={(t) => {
          setLink(t);
          setLinkError(null);
        }}
        error={linkError}
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="URL"
        maxLength={500}
        returnKeyType="done"
        onSubmitEditing={submit}
        testID="wish-link"
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
});
