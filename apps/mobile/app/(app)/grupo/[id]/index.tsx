import type { GroupDetail, MemberView } from '@entre-nos/contracts';
import {
  AnonymousAvatar,
  Avatar,
  Banner,
  BottomSheet,
  Button,
  Card,
  ConfirmDialog,
  CountdownBadge,
  Icon,
  IconButton,
  ListRow,
  Screen,
  SectionHeader,
  StatusChip,
  SwitchRow,
  Text,
  useTheme,
  useToast,
  type IconName,
} from '@entre-nos/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { InviteSheet, maybeOfferNotifications } from '../../../../src/components/sheets';
import { goBack, LoadError, LoadingScreen, OfflineBanner } from '../../../../src/components/states';
import {
  missingForDraw,
  participantsOf,
  useDrawNotice,
} from '../../../../src/features/groups/draw';
import {
  useDeleteGroup,
  useGroup,
  useLeaveGroup,
  useParticipation,
  useRemoveMember,
  useReopen,
  useRevealNow,
  useRotateInvite,
} from '../../../../src/features/groups/hooks';
import { errorMessage } from '../../../../src/lib/errors';
import { drawFeasibility, exclusionCount } from '../../../../src/lib/feasibility';
import { formatCop, formatDayShort } from '../../../../src/lib/format';
import { haptics } from '../../../../src/lib/haptics';
import { formatInviteCode } from '../../../../src/lib/invite';
import { copyText } from '../../../../src/lib/share';
import { usePrefs } from '../../../../src/state/prefs';

/** S5 — Detalle del grupo. */
export default function GroupScreen() {
  const { id, invite, joined } = useLocalSearchParams<{
    id: string;
    invite?: string;
    joined?: string;
  }>();
  const { data: g, error, refetch } = useGroup(id);
  if (!g) {
    return error ? (
      <Screen topBar={{ onBack: goBack }}>
        <LoadError error={error} onRetry={() => void refetch()} />
      </Screen>
    ) : (
      <LoadingScreen onBack={goBack} />
    );
  }
  return (
    <GroupDetailView
      g={g}
      autoInvite={invite === '1'}
      joined={joined === '1'}
      refetch={() => refetch()}
    />
  );
}

type Dialog =
  | { kind: 'draw' }
  | { kind: 'delete' }
  | { kind: 'reopen' }
  | { kind: 'redraw' }
  | { kind: 'reveal' }
  | { kind: 'leave' }
  | { kind: 'rotate' }
  | { kind: 'remove'; member: MemberView };

interface ViewProps {
  g: GroupDetail;
  autoInvite: boolean;
  joined: boolean;
  refetch: () => Promise<unknown>;
}

function GroupDetailView({ g, autoInvite, joined, refetch }: ViewProps) {
  const theme = useTheme();
  const toast = useToast();
  const me = g.members.find((m) => m.isMe);
  const organizer = g.members.find((m) => m.isOrganizer);
  const isOrg = g.isOrganizer;
  const iParticipate = me?.participates ?? false;
  const open = g.status === 'open';
  const participants = participantsOf(g);

  const [inviteOpen, setInviteOpen] = useState(autoInvite && open);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showJoined, setShowJoined] = useState(joined);
  const [refreshing, setRefreshing] = useState(false);
  const notice = useDrawNotice((s) => s.notices[g.id]);
  const seenDraw = usePrefs((s) => s.seenDraw[g.id]);

  const del = useDeleteGroup(g.id);
  const reopen = useReopen(g.id);
  const reveal = useRevealNow(g.id);
  const remove = useRemoveMember(g.id);
  const leave = useLeaveGroup(g.id, me?.id ?? '');
  const rotate = useRotateInvite(g.id);
  const participation = useParticipation(g.id);

  // Second (and last) chance to turn on notifications: once the draw happened.
  const drawn = g.status === 'drawn';
  useEffect(() => {
    if (drawn && iParticipate) void maybeOfferNotifications();
  }, [drawn, iParticipate]);

  const closeDialog = () => setDialog(null);
  const fail = (e: unknown) => {
    haptics.error();
    closeDialog();
    setActionError(errorMessage(e));
  };

  const startDraw = () => {
    const missing = missingForDraw(g);
    if (missing > 0) {
      haptics.warning();
      toast.show(`Necesitan al menos 3 personas para el sorteo. Invita a ${missing} más.`);
      setInviteOpen(true);
      return;
    }
    setDialog({ kind: 'draw' });
  };

  const confirm = () => {
    if (!dialog) return;
    setActionError(null);
    switch (dialog.kind) {
      case 'draw':
        closeDialog();
        useDrawNotice.getState().set(g.id, null);
        router.push({ pathname: '/grupo/[id]/sorteo', params: { id: g.id } });
        return;
      case 'redraw':
        closeDialog();
        useDrawNotice.getState().set(g.id, null);
        router.push({ pathname: '/grupo/[id]/sorteo', params: { id: g.id, mode: 'redraw' } });
        return;
      case 'reopen':
        reopen.mutate(undefined, {
          onSuccess: () => {
            closeDialog();
            toast.show('El grupo se abrió de nuevo. Cuando estén listos, sorteen otra vez.');
          },
          onError: fail,
        });
        return;
      case 'reveal':
        reveal.mutate(undefined, {
          onSuccess: () => {
            closeDialog();
            haptics.success();
            router.push({ pathname: '/grupo/[id]/revelacion', params: { id: g.id } });
          },
          onError: fail,
        });
        return;
      case 'delete':
        del.mutate(undefined, {
          onSuccess: () => {
            closeDialog();
            toast.show(`Eliminaste ${g.name}.`);
            router.replace('/');
          },
          onError: fail,
        });
        return;
      case 'leave':
        leave.mutate(undefined, {
          onSuccess: () => {
            closeDialog();
            toast.show(`Saliste de ${g.name}.`);
            router.replace('/');
          },
          onError: fail,
        });
        return;
      case 'rotate':
        rotate.mutate(undefined, {
          onSuccess: () => {
            closeDialog();
            toast.show('Listo, el código cambió. Comparte el nuevo.');
          },
          onError: fail,
        });
        return;
      case 'remove': {
        const name = dialog.member.name;
        remove.mutate(dialog.member.id, {
          onSuccess: () => {
            closeDialog();
            toast.show(`${name} ya no está en el grupo. El código cambió.`);
          },
          onError: fail,
        });
        return;
      }
    }
  };

  const busy =
    del.isPending ||
    reopen.isPending ||
    reveal.isPending ||
    remove.isPending ||
    leave.isPending ||
    rotate.isPending;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch().catch(() => undefined);
    setRefreshing(false);
  };

  const menu = menuItems(g, iParticipate, (d) => {
    setMenuOpen(false);
    if (d === 'edit') router.push({ pathname: '/grupo/[id]/editar', params: { id: g.id } });
    else setDialog({ kind: d });
  });

  const feasibility =
    isOrg && open
      ? drawFeasibility(
          participants.map((m) => m.id),
          g.exclusions,
        )
      : null;
  const blockedName =
    feasibility && !feasibility.ok && feasibility.reason === 'blocked'
      ? g.members.find((m) => feasibility.blocking.includes(m.id))?.name
      : undefined;

  return (
    <Screen
      testID="group-screen"
      topBar={{
        title: g.name,
        onBack: goBack,
        right:
          menu.length > 0 ? (
            <IconButton
              icon="more"
              accessibilityLabel="Más opciones"
              onPress={() => setMenuOpen(true)}
              testID="group-menu"
            />
          ) : undefined,
      }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
      footer={footerFor(g, {
        isOrg,
        iParticipate,
        organizerName: organizer?.name ?? 'quien organiza',
        onDraw: startDraw,
      })}
    >
      <OfflineBanner />
      {showJoined && open ? (
        <Banner
          kind="success"
          title={`¡Ya estás en ${g.name}!`}
          message="Mientras hacen el sorteo, agrega ideas a tu lista para que tu amigo secreto le atine."
          action={{
            label: 'Agregar ideas',
            onPress: () => {
              setShowJoined(false);
              router.push({ pathname: '/grupo/[id]/lista', params: { id: g.id } });
            },
          }}
          testID="joined-banner"
        />
      ) : null}
      {notice ? (
        <Banner
          kind="error"
          message={notice.message}
          testID="draw-error"
          action={
            notice.reviewExclusions
              ? {
                  label: 'Revisar exclusiones',
                  onPress: () =>
                    router.push({ pathname: '/grupo/[id]/exclusiones', params: { id: g.id } }),
                }
              : undefined
          }
        />
      ) : null}
      {actionError ? <Banner kind="error" message={actionError} testID="action-error" /> : null}

      <InfoCard g={g} />

      {g.status === 'revealed' ? (
        <Card accentBorder onPress={() => goReveal(g.id)} testID="revealed-card">
          <View style={[styles.row, { gap: theme.space.md }]}>
            <Icon name="gift" color="accentText" size={28} />
            <View style={styles.flex}>
              <Text variant="title3">¡Llegó la revelación!</Text>
              <Text variant="caption" color="textSecondary">
                Mira quién le regaló a quién.
              </Text>
            </View>
            <Icon name="chevronRight" color="textSecondary" />
          </View>
        </Card>
      ) : null}

      {drawn ? (
        <DrawnSection
          g={g}
          iParticipate={iParticipate}
          seen={seenDraw === g.drawCount}
          onReveal={isOrg && g.daysLeft <= 0 ? () => setDialog({ kind: 'reveal' }) : undefined}
        />
      ) : null}

      {open || drawn ? (
        <Banner
          kind="privacy"
          message={
            isOrg
              ? 'El sorteo lo hace la app. Ni tú como organizador vas a saber a quién le tocó quién.'
              : 'El sorteo lo hace la app. Nadie, ni el organizador, puede ver a quién le tocó quién.'
          }
        />
      ) : null}

      <SectionHeader
        title={`MIEMBROS (${g.members.length})`}
        right={
          open ? (
            <Button
              variant="ghost"
              size="small"
              icon="plus"
              label="Invitar"
              onPress={() => setInviteOpen(true)}
              testID="group-invite"
            />
          ) : drawn ? (
            <StatusChip kind="drawn" label="Sorteo hecho" />
          ) : undefined
        }
      />
      <View testID="members-list">
        {g.members.map((m) => (
          <MemberRow
            key={m.id}
            m={m}
            showExclusions={isOrg && open}
            exclusions={exclusionCount(m.id, g.exclusions)}
            onRemove={
              isOrg && open && !m.isMe ? () => setDialog({ kind: 'remove', member: m }) : undefined
            }
          />
        ))}
      </View>

      {isOrg && open ? (
        <SwitchRow
          label="Yo también participo en el sorteo"
          description="Si lo apagas, solo organizas: no das ni recibes regalo."
          value={iParticipate}
          disabled={participation.isPending}
          onValueChange={(v) =>
            participation.mutate(v, { onError: (e) => setActionError(errorMessage(e)) })
          }
          testID="group-participates"
        />
      ) : null}

      {isOrg && open ? (
        <ListRow
          icon="exclusion"
          title="Exclusiones"
          detail="Parejas o gente de la misma casa que no se regalan entre sí"
          right={
            <Text variant="caption" color="textSecondary">
              {`${g.exclusions.length} ${g.exclusions.length === 1 ? 'activa' : 'activas'}`}
            </Text>
          }
          chevron
          onPress={() => router.push({ pathname: '/grupo/[id]/exclusiones', params: { id: g.id } })}
          testID="group-exclusions"
        />
      ) : !isOrg && g.exclusions.length > 0 ? (
        <Text variant="caption" color="textSecondary">
          {`${organizer?.name ?? 'Quien organiza'} definió ${g.exclusions.length} ${
            g.exclusions.length === 1 ? 'exclusión' : 'exclusiones'
          }.`}
        </Text>
      ) : null}

      {open ? (
        <Card
          onPress={() => {
            void copyText(formatInviteCode(g.inviteCode));
            haptics.tapLight();
            toast.show('Código copiado');
          }}
          accessibilityLabel={`Código del grupo: ${g.inviteCode.split('').join(' ')}. Toca para copiarlo.`}
          testID="group-code-card"
        >
          <View style={[styles.row, { gap: theme.space.md }]}>
            <View style={styles.flex}>
              <Text variant="label" color="textSecondary">
                Código del grupo
              </Text>
              <Text variant="code" testID="group-code" selectable>
                {formatInviteCode(g.inviteCode)}
              </Text>
            </View>
            <Icon name="copy" color="textSecondary" />
          </View>
        </Card>
      ) : null}

      {feasibility && !feasibility.ok && feasibility.reason === 'blocked' ? (
        <Banner
          kind="warning"
          message={
            blockedName
              ? `Con estas exclusiones no se puede sortear: ${blockedName} no tiene a quién regalarle. Quítale alguna exclusión o invita a más personas.`
              : 'Con estas exclusiones no se puede sortear. Quita algunas o invita a más personas.'
          }
          testID="group-feasibility"
        />
      ) : null}

      <InviteSheet
        visible={inviteOpen}
        onClose={() => {
          setInviteOpen(false);
          if (autoInvite) void maybeOfferNotifications();
        }}
        group={g}
      />

      <BottomSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Opciones del grupo"
        testID="group-menu-sheet"
      >
        {menu.map((item) => (
          <ListRow
            key={item.key}
            icon={item.icon}
            title={item.label}
            onPress={item.onPress}
            testID={`menu-${item.key}`}
          />
        ))}
      </BottomSheet>

      {dialog ? (
        <ConfirmDialog
          visible
          {...dialogCopy(dialog, g, participants.length)}
          loading={busy}
          onConfirm={confirm}
          onCancel={closeDialog}
          testID={`dialog-${dialog.kind}`}
        />
      ) : null}
    </Screen>
  );
}

function goReveal(id: string) {
  router.push({ pathname: '/grupo/[id]/revelacion', params: { id } });
}

// ---------- pieces ----------

function InfoCard({ g }: { g: GroupDetail }) {
  const theme = useTheme();
  return (
    <Card testID="group-info">
      <View style={{ gap: theme.space.sm }}>
        <View style={[styles.row, { gap: theme.space.sm }]}>
          <Icon name="calendar" color="textSecondary" />
          <Text variant="bodyStrong" style={styles.flex}>
            {formatDayShort(g.deliveryDate)}
          </Text>
          <CountdownBadge daysLeft={g.daysLeft} />
        </View>
        <View style={[styles.row, { gap: theme.space.sm }]}>
          <Icon name="budget" color="textSecondary" />
          <Text variant="body">
            {g.budgetCop !== null ? `${formatCop(g.budgetCop)} por regalo` : 'Sin presupuesto fijo'}
          </Text>
        </View>
      </View>
    </Card>
  );
}

function organizerLabel(m: MemberView): string {
  if (!m.participates) return 'Organiza · no participa';
  return m.isMe ? 'Organizas tú' : 'Organiza';
}

function MemberRow({
  m,
  showExclusions,
  exclusions,
  onRemove,
}: {
  m: MemberView;
  showExclusions: boolean;
  exclusions: number;
  onRemove?: () => void;
}) {
  const theme = useTheme();
  const detail =
    showExclusions && exclusions > 0
      ? `${exclusions} ${exclusions === 1 ? 'exclusión' : 'exclusiones'}`
      : undefined;
  return (
    <ListRow
      left={<Avatar name={m.name} seed={m.id} photo={m.photo} size="md" />}
      title={m.isMe && !m.isOrganizer ? `${m.name} (tú)` : m.name}
      detail={detail}
      testID={`member-${m.id}`}
      right={
        <View style={[styles.row, { gap: theme.space.xs }]}>
          {m.isOrganizer ? <StatusChip kind="organizer" label={organizerLabel(m)} /> : null}
          {onRemove ? (
            <IconButton
              icon="more"
              accessibilityLabel={`Opciones para ${m.name}`}
              onPress={onRemove}
              testID={`member-${m.id}-more`}
            />
          ) : null}
        </View>
      }
    />
  );
}

function DrawnSection({
  g,
  iParticipate,
  seen,
  onReveal,
}: {
  g: GroupDetail;
  iParticipate: boolean;
  seen: boolean;
  onReveal?: () => void;
}) {
  const theme = useTheme();
  const params = { id: g.id };
  return (
    <View style={{ gap: theme.space.sm }}>
      {!iParticipate ? (
        <Card testID="secret-card-organizer">
          <View style={[styles.row, { gap: theme.space.md }]}>
            <Icon name="lock" color="textSecondary" />
            <Text variant="body" style={styles.flex}>
              Solo organizas este grupo. Tú tampoco sabes a quién le tocó quién.
            </Text>
          </View>
        </Card>
      ) : seen ? (
        <Card
          onPress={() => router.push({ pathname: '/grupo/[id]/amigo', params })}
          accessibilityLabel="Tu amigo secreto. Nombre oculto. Toca para ver su lista y escribirle."
          testID="secret-card"
        >
          <View style={[styles.row, { gap: theme.space.md }]}>
            <AnonymousAvatar size="lg" />
            <View style={styles.flex}>
              <Text variant="label" color="textSecondary">
                Tu amigo secreto
              </Text>
              <Text variant="title3">••••••</Text>
              <Text variant="caption" color="textSecondary">
                Toca para ver su lista y escribirle
              </Text>
            </View>
            <Icon name="chevronRight" color="textSecondary" />
          </View>
        </Card>
      ) : (
        <Card
          accentBorder
          onPress={() => router.push({ pathname: '/grupo/[id]/revelar', params })}
          accessibilityLabel="Tu amigo secreto. Toca para ver a quién te tocó."
          testID="secret-card-reveal"
        >
          <View style={[styles.row, { gap: theme.space.md }]}>
            <View
              style={[
                styles.circle,
                { backgroundColor: theme.color.accent, borderRadius: theme.radius.full },
              ]}
            >
              <Icon name="gift" color="textOnAccent" size={28} />
            </View>
            <View style={styles.flex}>
              <Text variant="label" color="textSecondary">
                Tu amigo secreto
              </Text>
              <Text variant="title3">Toca para ver a quién te tocó</Text>
            </View>
            <Icon name="chevronRight" color="textSecondary" />
          </View>
        </Card>
      )}
      {iParticipate ? (
        <>
          <Button
            variant="outline"
            icon="wishlist"
            label="Mi lista de deseos"
            onPress={() => router.push({ pathname: '/grupo/[id]/lista', params })}
            fullWidth
            testID="group-wishlist"
          />
          <Button
            variant="ghost"
            icon="chat"
            label="Mensajes de quien te regala"
            onPress={() => router.push({ pathname: '/grupo/[id]/chat', params })}
            fullWidth
            testID="group-receiver-chat"
          />
        </>
      ) : null}
      {onReveal ? (
        <Button
          variant="accent"
          icon="gift"
          label="Revelar quién le regaló a quién"
          onPress={onReveal}
          fullWidth
          testID="group-reveal"
        />
      ) : null}
    </View>
  );
}

function footerFor(
  g: GroupDetail,
  o: { isOrg: boolean; iParticipate: boolean; organizerName: string; onDraw: () => void },
) {
  if (g.status !== 'open') return undefined;
  if (o.isOrg) {
    return (
      <>
        <Button
          variant="secondary"
          icon="draw"
          label="Hacer el sorteo"
          onPress={o.onDraw}
          fullWidth
          testID="group-draw"
        />
        <Text variant="caption" color="textSecondary" align="center">
          Hazlo cuando estén todos. Después, para entrar o salir, hay que sortear de nuevo.
        </Text>
      </>
    );
  }
  return (
    <>
      <Button
        icon="wishlist"
        label="Mi lista de deseos"
        onPress={() => router.push({ pathname: '/grupo/[id]/lista', params: { id: g.id } })}
        fullWidth
        testID="group-wishlist"
      />
      <Text variant="caption" color="textSecondary" align="center">
        {`Cuando ${o.organizerName} haga el sorteo te avisamos.`}
      </Text>
    </>
  );
}

type MenuAction = 'edit' | 'delete' | 'reopen' | 'redraw' | 'leave' | 'rotate';

function menuItems(
  g: GroupDetail,
  iParticipate: boolean,
  pick: (a: MenuAction) => void,
): { key: MenuAction; label: string; icon: IconName; onPress: () => void }[] {
  const items: { key: MenuAction; label: string; icon: IconName }[] = [];
  if (g.isOrganizer) {
    if (g.status !== 'revealed') items.push({ key: 'edit', label: 'Editar grupo', icon: 'edit' });
    if (g.status === 'open') {
      items.push({ key: 'rotate', label: 'Cambiar el código', icon: 'code' });
    }
    if (g.status === 'drawn') {
      items.push({ key: 'reopen', label: 'Agregar o quitar personas', icon: 'users' });
      if (g.redrawsLeft > 0) items.push({ key: 'redraw', label: 'Sortear de nuevo', icon: 'draw' });
    }
    items.push({ key: 'delete', label: 'Eliminar grupo', icon: 'trash' });
  } else if (g.status === 'open' || !iParticipate) {
    items.push({ key: 'leave', label: 'Salir del grupo', icon: 'leave' });
  }
  return items.map((i) => ({ ...i, onPress: () => pick(i.key) }));
}

function dialogCopy(d: Dialog, g: GroupDetail, participantCount: number) {
  switch (d.kind) {
    case 'draw':
      return {
        title: '¿Hacer el sorteo ya?',
        message: `Son ${participantCount} personas. Después del sorteo, para que alguien entre o salga, hay que sortear de nuevo.`,
        confirmLabel: 'Sortear',
        cancelLabel: 'Todavía no',
        confirmVariant: 'secondary' as const,
      };
    case 'redraw':
      return {
        title: '¿Sortear de nuevo?',
        message:
          'A todos les va a tocar otra persona y se borran los mensajes secretos. Avisaremos a todo el grupo.',
        confirmLabel: 'Sortear de nuevo',
        confirmVariant: 'destructive' as const,
      };
    case 'reopen':
      return {
        title: '¿Abrir el grupo otra vez?',
        message:
          'El sorteo actual se anula para que puedan entrar o salir personas. Después tendrás que sortear de nuevo y a todos les puede tocar otra persona.',
        confirmLabel: 'Abrir el grupo',
        confirmLoadingLabel: 'Abriendo…',
        confirmVariant: 'destructive' as const,
      };
    case 'reveal':
      return {
        title: '¿Revelar quién le regaló a quién?',
        message: 'Todos van a ver la lista completa. Hazlo cuando ya hayan entregado los regalos.',
        confirmLabel: 'Revelar ahora',
        confirmLoadingLabel: 'Revelando…',
        cancelLabel: 'Todavía no',
        confirmVariant: 'primary' as const,
      };
    case 'delete':
      return {
        title: `¿Eliminar ${g.name}?`,
        message: 'Se borran el sorteo, las listas y los mensajes de todos. No se puede deshacer.',
        confirmLabel: 'Eliminar grupo',
        confirmLoadingLabel: 'Eliminando…',
        confirmVariant: 'destructive' as const,
      };
    case 'leave':
      return {
        title: `¿Salir de ${g.name}?`,
        message: 'Ya no vas a participar en este amigo secreto.',
        confirmLabel: 'Salir del grupo',
        confirmLoadingLabel: 'Saliendo…',
        confirmVariant: 'destructive' as const,
      };
    case 'rotate':
      return {
        title: '¿Cambiar el código?',
        message:
          'El enlace y el código de ahora dejan de funcionar. Vas a tener que compartir el nuevo.',
        confirmLabel: 'Cambiar código',
        confirmLoadingLabel: 'Cambiando…',
        confirmVariant: 'primary' as const,
      };
    case 'remove':
      return {
        title: `¿Quitar a ${d.member.name} del grupo?`,
        message:
          'Ya no va a participar en el sorteo ni podrá volver a entrar. Cambiaremos el código para que el anterior deje de funcionar.',
        confirmLabel: 'Quitar del grupo',
        confirmLoadingLabel: 'Quitando…',
        confirmVariant: 'destructive' as const,
      };
  }
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1, gap: 2 },
  circle: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
});
