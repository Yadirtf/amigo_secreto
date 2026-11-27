import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import {
  Avatar,
  BottomSheet,
  Button,
  Chip,
  Screen,
  SwitchRow,
  Text,
  TextField,
  Banner,
  useTheme,
} from '@entre-nos/ui';
import { useRef, useState, type ComponentRef } from 'react';
import { Platform, StyleSheet, View, type TextInput } from 'react-native';
import { addDays, bogotaToday, deliveryDefaults } from '../lib/dates';
import {
  formatDayChip,
  formatMoneyInput,
  parseIsoDay,
  parseMoneyInput,
  thousands,
  toIsoDay,
} from '../lib/format';
import { haptics } from '../lib/haptics';
import { PhotoSheet } from './sheets';

export interface GroupFormValues {
  name: string;
  deliveryDate: string;
  budgetCop: number;
  photo: string | null;
  organizerParticipates: boolean;
}

export interface GroupFormProps {
  mode: 'create' | 'edit';
  initial?: Partial<GroupFormValues>;
  /** After the draw the delivery date can only move forward. */
  minDate?: string;
  submitting: boolean;
  submitError?: string | null;
  onSubmit: (values: GroupFormValues) => void;
  onBack: () => void;
}

const BUDGET_MAX_REASONABLE = 10_000_000;

/** S3 Crear grupo (and "Editar grupo"): 4 fields, ≤ 30 s. */
export function GroupForm({
  mode,
  initial,
  minDate,
  submitting,
  submitError,
  onSubmit,
  onBack,
}: GroupFormProps) {
  const theme = useTheme();
  const today = bogotaToday();
  const defaults = deliveryDefaults(today);
  const earliest = minDate && minDate > addDays(today, 1) ? minDate : addDays(today, 1);

  const [photo, setPhoto] = useState<string | null>(initial?.photo ?? null);
  const [photoSheet, setPhotoSheet] = useState(false);
  const [name, setName] = useState(initial?.name ?? '');
  const [date, setDate] = useState(initial?.deliveryDate ?? defaults.selected);
  const [budget, setBudget] = useState(
    initial?.budgetCop !== undefined ? thousands(initial.budgetCop) : '',
  );
  const [soloOrganizer, setSoloOrganizer] = useState(initial?.organizerParticipates === false);
  const [errors, setErrors] = useState<{ name?: string; budget?: string }>({});
  const [iosPicker, setIosPicker] = useState(false);
  const nameRef = useRef<ComponentRef<typeof TextInput>>(null);
  const budgetRef = useRef<ComponentRef<typeof TextInput>>(null);

  const chipDates = Array.from(new Set([...defaults.options, date])).filter((d) => d >= earliest);

  const validate = () => {
    const next: { name?: string; budget?: string } = {};
    if (name.trim().length < 2)
      next.name = 'Ponle un nombre al grupo para que todos lo reconozcan.';
    const amount = parseMoneyInput(budget);
    if (amount === null) next.budget = 'Escribe el presupuesto por regalo, por ejemplo 50.000.';
    else if (amount < 1000) next.budget = 'El presupuesto tiene que ser de al menos $ 1.000.';
    else if (amount > BUDGET_MAX_REASONABLE)
      next.budget = 'Ese presupuesto parece muy alto. Revisa que no sobren ceros.';
    setErrors(next);
    if (next.name) nameRef.current?.focus();
    else if (next.budget) budgetRef.current?.focus();
    if (next.name || next.budget) haptics.error();
    return !next.name && !next.budget;
  };

  const submit = () => {
    if (!validate()) return;
    onSubmit({
      name: name.trim(),
      deliveryDate: date,
      budgetCop: parseMoneyInput(budget) ?? 0,
      photo,
      organizerParticipates: !soloOrganizer,
    });
  };

  const pickOtherDate = () => {
    const p = parseIsoDay(date);
    const min = parseIsoDay(earliest);
    const value = new Date(p.year, p.month - 1, p.day);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode: 'date',
        minimumDate: new Date(min.year, min.month - 1, min.day),
        onChange: (event, picked) => {
          if (event.type !== 'set' || !picked) return;
          setDate(
            toIsoDay({
              year: picked.getFullYear(),
              month: picked.getMonth() + 1,
              day: picked.getDate(),
            }),
          );
        },
      });
    } else {
      setIosPicker(true);
    }
  };

  return (
    <Screen
      testID={mode === 'create' ? 'create-group-screen' : 'edit-group-screen'}
      topBar={{ title: mode === 'create' ? 'Nuevo grupo' : 'Editar grupo', onBack }}
      footer={
        <>
          {submitError ? <Banner kind="error" message={submitError} testID="form-error" /> : null}
          <Button
            label={mode === 'create' ? 'Crear grupo' : 'Guardar cambios'}
            loadingLabel={mode === 'create' ? 'Creando…' : 'Guardando…'}
            loading={submitting}
            onPress={submit}
            fullWidth
            testID="group-form-submit"
          />
        </>
      }
    >
      <View style={[styles.photoRow, { gap: theme.space.lg }]}>
        <Avatar
          name={name || 'Grupo'}
          seed={name || 'nuevo'}
          photo={photo}
          size="xl"
          onPress={() => setPhotoSheet(true)}
          accessibilityLabel={photo ? 'Cambiar foto del grupo' : 'Agregar foto del grupo'}
        />
        <Button
          variant="ghost"
          icon="camera"
          label={photo ? 'Cambiar foto' : 'Agregar foto'}
          onPress={() => setPhotoSheet(true)}
          testID="group-photo-button"
        />
      </View>

      <TextField
        ref={nameRef}
        label="Nombre del grupo"
        placeholder="Ej: Oficina 2026, Familia Gómez"
        value={name}
        onChangeText={(t) => {
          setName(t);
          if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
        }}
        autoFocus={mode === 'create'}
        autoCapitalize="sentences"
        maxLength={40}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => budgetRef.current?.focus()}
        error={errors.name}
        testID="group-name-input"
      />

      <View style={{ gap: theme.space.sm }}>
        <Text variant="label">Fecha de entrega</Text>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {chipDates.map((d) => (
            <Chip
              key={d}
              label={formatDayChip(d)}
              selected={d === date}
              onPress={() => {
                haptics.selection();
                setDate(d);
              }}
              testID={`date-chip-${d}`}
            />
          ))}
          <Chip
            label="Otra fecha"
            icon="calendar"
            role="button"
            onPress={pickOtherDate}
            testID="date-chip-other"
          />
        </View>
      </View>

      <TextField
        ref={budgetRef}
        label="Presupuesto por regalo"
        variant="money"
        prefix="$"
        placeholder="Ej: 50.000"
        value={budget}
        onChangeText={(t) => {
          setBudget(formatMoneyInput(t));
          if (errors.budget) setErrors((e) => ({ ...e, budget: undefined }));
        }}
        helper="Lo que acordaron entre todos."
        returnKeyType="done"
        onSubmitEditing={submit}
        error={errors.budget}
        testID="group-budget-input"
      />

      {mode === 'create' ? (
        <SwitchRow
          label="Solo organizo, no participo"
          description="Activa esto si no vas a dar ni recibir regalo."
          value={soloOrganizer}
          onValueChange={(v) => {
            haptics.selection();
            setSoloOrganizer(v);
          }}
          testID="solo-organizer-switch"
        />
      ) : null}

      <PhotoSheet
        visible={photoSheet}
        onClose={() => setPhotoSheet(false)}
        hasPhoto={!!photo}
        onPicked={setPhoto}
        onRemove={() => setPhoto(null)}
        title="Foto del grupo"
      />

      {Platform.OS !== 'android' ? (
        <BottomSheet
          visible={iosPicker}
          onClose={() => setIosPicker(false)}
          title="Fecha de entrega"
          footer={<Button label="Listo" onPress={() => setIosPicker(false)} fullWidth />}
        >
          <DateTimePicker
            value={(() => {
              const p = parseIsoDay(date);
              return new Date(p.year, p.month - 1, p.day);
            })()}
            mode="date"
            display="inline"
            minimumDate={(() => {
              const p = parseIsoDay(earliest);
              return new Date(p.year, p.month - 1, p.day);
            })()}
            onChange={(_e, picked) => {
              if (picked) {
                setDate(
                  toIsoDay({
                    year: picked.getFullYear(),
                    month: picked.getMonth() + 1,
                    day: picked.getDate(),
                  }),
                );
              }
            }}
          />
        </BottomSheet>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  photoRow: { flexDirection: 'row', alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
