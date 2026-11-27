import type { GroupDetail, MemberView } from '@entre-nos/contracts';
import {
  Avatar,
  Banner,
  BottomSheet,
  Button,
  CheckRow,
  EmptyState,
  ListRow,
  Screen,
  Text,
  useTheme,
} from '@entre-nos/ui';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { goBack, LoadError, LoadingScreen, OfflineBanner } from '../../../../src/components/states';
import { useGroup, useSaveExclusions } from '../../../../src/features/groups/hooks';
import type { ExclusionPair } from '../../../../src/api/endpoints';
import { errorMessage } from '../../../../src/lib/errors';
import {
  drawFeasibility,
  exclusionCount,
  MAX_EXCLUSIONS_PER_PERSON,
} from '../../../../src/lib/feasibility';
import { haptics } from '../../../../src/lib/haptics';

/** S6 — Editor de exclusiones (organizer). */
export default function ExclusionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: g, error, refetch } = useGroup(id);
  if (!g) {
    return error ? (
      <Screen topBar={{ title: 'Exclusiones', onBack: goBack }}>
        <LoadError error={error} onRetry={() => void refetch()} />
      </Screen>
    ) : (
      <LoadingScreen title="Exclusiones" onBack={goBack} />
    );
  }
  return <ExclusionsEditor g={g} />;
}

const samePair = (p: ExclusionPair, a: string, b: string) =>
  (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a);

function ExclusionsEditor({ g }: { g: GroupDetail }) {
  const theme = useTheme();
  const save = useSaveExclusions(g.id);
  const people = g.members.filter((m) => m.participates);
  const [pairs, setPairs] = useState<ExclusionPair[]>(() =>
    g.exclusions.map(([a, b]) => [a, b] as ExclusionPair),
  );
  const [editing, setEditing] = useState<MemberView | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const editable = g.isOrganizer && g.status === 'open';

  const nameOf = (uid: string) => g.members.find((m) => m.id === uid)?.name ?? '';
  const excludedFor = (uid: string) =>
    pairs.filter(([a, b]) => a === uid || b === uid).map(([a, b]) => (a === uid ? b : a));

  const persist = (next: ExclusionPair[]) => {
    const before = JSON.stringify(g.exclusions);
    if (JSON.stringify(next) === before) return;
    setSaveError(null);
    save.mutate(next, {
      onError: (e) => {
        haptics.error();
        setSaveError(errorMessage(e, 'exclusions'));
        setPairs(g.exclusions.map(([a, b]) => [a, b] as ExclusionPair));
      },
    });
  };

  const toggle = (a: string, b: string) => {
    haptics.selection();
    setPairs((prev) =>
      prev.some((p) => samePair(p, a, b))
        ? prev.filter((p) => !samePair(p, a, b))
        : [...prev, [a, b]],
    );
  };

  const closeSheet = () => {
    setEditing(null);
    persist(pairs);
  };

  const feasibility = drawFeasibility(
    people.map((p) => p.id),
    pairs,
  );
  let status: React.ReactNode;
  if (feasibility.ok) {
    status = <Banner kind="success" message="El sorteo es posible" testID="feasibility-ok" />;
  } else if (feasibility.reason === 'not_enough') {
    status = (
      <Banner
        kind="info"
        message={`Necesitan al menos 3 personas para el sorteo. Invita a ${feasibility.missing} más.`}
        testID="feasibility-few"
      />
    );
  } else {
    const name = feasibility.blocking[0] ? nameOf(feasibility.blocking[0]) : '';
    status = (
      <Banner
        kind="warning"
        message={
          name
            ? `Con estas exclusiones no se puede sortear: ${name} no tiene a quién regalarle. Quítale alguna exclusión o invita a más personas.`
            : 'Con estas exclusiones no se puede sortear. Quita algunas o invita a más personas.'
        }
        testID="feasibility-blocked"
      />
    );
  }

  return (
    <Screen testID="exclusions-screen" topBar={{ title: 'Exclusiones', onBack: goBack }}>
      <OfflineBanner />
      <Text variant="body">
        Marca quiénes NO se pueden regalar entre sí (parejas, gente de la misma casa). Funciona en
        los dos sentidos.
      </Text>
      <Text variant="caption" color="textSecondary">
        {`Máximo ${MAX_EXCLUSIONS_PER_PERSON} por persona.`}
      </Text>
      {!editable ? (
        <Banner
          kind="info"
          message="El sorteo ya está hecho, así que esto no se puede cambiar ahora."
        />
      ) : null}
      {saveError ? <Banner kind="error" message={saveError} testID="exclusions-error" /> : null}
      {people.length === 0 ? (
        <EmptyState
          icon="users"
          title="Todavía no hay nadie"
          body="Cuando entren personas al grupo, aquí podrás marcar quién no le regala a quién."
        />
      ) : (
        <View>
          {people.map((m) => {
            const ex = excludedFor(m.id);
            return (
              <ListRow
                key={m.id}
                left={<Avatar name={m.name} seed={m.id} photo={m.photo} size="md" />}
                title={m.name}
                detail={ex.length > 0 ? ex.map(nameOf).join(', ') : 'Ninguna'}
                chevron={editable}
                onPress={editable ? () => setEditing(m) : undefined}
                accessibilityLabel={`${m.name}. ${
                  ex.length > 0 ? `No le regala a ${ex.map(nameOf).join(', ')}` : 'Sin exclusiones'
                }`}
                testID={`exclusion-row-${m.id}`}
              />
            );
          })}
        </View>
      )}
      {people.length > 0 ? status : null}

      {editing ? (
        <BottomSheet
          visible
          onClose={closeSheet}
          title={`¿A quién no le puede regalar ${editing.name}?`}
          testID="exclusion-sheet"
          footer={<Button label="Listo" onPress={closeSheet} fullWidth testID="exclusion-done" />}
        >
          <View style={{ gap: theme.space.xs }}>
            {people
              .filter((o) => o.id !== editing.id)
              .map((o) => {
                const checked = pairs.some((p) => samePair(p, editing.id, o.id));
                const mineFull = exclusionCount(editing.id, pairs) >= MAX_EXCLUSIONS_PER_PERSON;
                const otherFull = exclusionCount(o.id, pairs) >= MAX_EXCLUSIONS_PER_PERSON;
                const disabled = !checked && (mineFull || otherFull);
                return (
                  <CheckRow
                    key={o.id}
                    label={o.name}
                    detail={
                      disabled
                        ? `${mineFull ? editing.name : o.name} ya tiene ${MAX_EXCLUSIONS_PER_PERSON} exclusiones, el máximo.`
                        : undefined
                    }
                    left={<Avatar name={o.name} seed={o.id} photo={o.photo} size="sm" />}
                    checked={checked}
                    disabled={disabled}
                    onToggle={() => toggle(editing.id, o.id)}
                    testID={`exclusion-check-${o.id}`}
                  />
                );
              })}
          </View>
        </BottomSheet>
      ) : null}
    </Screen>
  );
}
