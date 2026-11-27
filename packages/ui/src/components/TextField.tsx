import { forwardRef, useState, type ComponentRef } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../theme';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
import { Text } from './Text';

export type TextFieldVariant = 'default' | 'money' | 'code' | 'url' | 'multiline';

export interface TextFieldProps extends Omit<TextInputProps, 'style' | 'multiline'> {
  label: string;
  helper?: string;
  error?: string | null;
  success?: string | null;
  loading?: boolean;
  loadingText?: string;
  variant?: TextFieldVariant;
  /** Fixed prefix inside the box (money uses "$"). */
  prefix?: string;
  /** Shows a clear (x) button when there is text. */
  clearable?: boolean;
  /** Character counter shown from this length on. */
  counterFrom?: number;
  /** Element rendered to the right of the helper line (e.g. "Pegar"). */
  helperAction?: React.ReactNode;
  containerStyle?: ViewStyle;
  disabled?: boolean;
}

/**
 * Style guide §8.2. The label is always visible; validation happens on blur
 * or submit (the screen decides), never while typing.
 */
export const TextField = forwardRef<ComponentRef<typeof TextInput>, TextFieldProps>(
  function TextField(
    {
      label,
      helper,
      error,
      success,
      loading,
      loadingText,
      variant = 'default',
      prefix,
      clearable,
      counterFrom,
      helperAction,
      containerStyle,
      disabled,
      value,
      maxLength,
      onFocus,
      onBlur,
      onChangeText,
      ...rest
    },
    ref,
  ) {
    const theme = useTheme();
    const [focused, setFocused] = useState(false);
    const isCode = variant === 'code';
    const isMultiline = variant === 'multiline';
    const hasError = !!error;
    const borderColor = hasError
      ? theme.color.danger
      : focused
        ? theme.color.focus
        : disabled
          ? theme.color.border
          : theme.color.borderStrong;
    const borderWidth = hasError || focused ? 2 : theme.size.borderWidthStrong;
    const length = value?.length ?? 0;
    const showCounter =
      counterFrom !== undefined && maxLength !== undefined && length >= counterFrom;
    const atMax = maxLength !== undefined && length >= maxLength;
    const typeStyle = isCode ? theme.type.code : theme.type.body;

    const keyboardProps: Partial<TextInputProps> =
      variant === 'money'
        ? { keyboardType: 'number-pad' }
        : variant === 'url'
          ? {
              keyboardType: 'url',
              autoCapitalize: 'none',
              autoCorrect: false,
              textContentType: 'URL',
            }
          : isCode
            ? {
                autoCapitalize: 'characters',
                autoCorrect: false,
                keyboardType: 'visible-password',
              }
            : {};

    const a11yLabel = hasError ? `${label}, error: ${error}` : label;

    return (
      <View style={[styles.container, containerStyle]}>
        <Text variant="label" color={disabled ? 'textDisabled' : 'textPrimary'}>
          {label}
        </Text>
        <View
          style={[
            styles.box,
            {
              minHeight: theme.size.inputHeight,
              borderRadius: theme.radius.sm,
              borderColor,
              borderWidth,
              backgroundColor: disabled ? theme.color.disabledBg : theme.color.surface,
              paddingHorizontal: theme.space.lg - (borderWidth - 1.5),
            },
          ]}
        >
          {prefix ? (
            <Text variant="body" color="textSecondary" style={styles.prefix}>
              {prefix}
            </Text>
          ) : null}
          <TextInput
            ref={ref}
            value={value}
            maxLength={maxLength}
            editable={!disabled}
            multiline={isMultiline}
            accessibilityLabel={a11yLabel}
            accessibilityHint={helper}
            accessibilityState={{ disabled: !!disabled, busy: !!loading }}
            placeholderTextColor={theme.color.textSecondary}
            selectionColor={theme.color.primaryText}
            cursorColor={theme.color.primaryText}
            maxFontSizeMultiplier={typeStyle.maxFontSizeMultiplier}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            onChangeText={onChangeText}
            {...keyboardProps}
            {...rest}
            style={[
              typeStyle.style,
              styles.input,
              {
                color: disabled ? theme.color.textDisabled : theme.color.textPrimary,
                textAlign: isCode ? 'center' : 'left',
                maxHeight: isMultiline
                  ? (theme.type.body.style.lineHeight ?? 24) * 5 + 24
                  : undefined,
              },
            ]}
          />
          {loading ? <ActivityIndicator size="small" color={theme.color.textSecondary} /> : null}
          {clearable && !loading && length > 0 && !disabled ? (
            <IconButton
              icon="close"
              size={20}
              color="textSecondary"
              accessibilityLabel={`Borrar ${label.toLowerCase()}`}
              onPress={() => onChangeText?.('')}
            />
          ) : null}
        </View>
        <View style={styles.helperRow}>
          <View style={styles.helperText} accessibilityLiveRegion="polite">
            {hasError ? (
              <View style={styles.inline}>
                <Icon name="error" size={16} color="danger" />
                <Text variant="caption" color="danger" style={styles.flex}>
                  {error}
                </Text>
              </View>
            ) : loading && loadingText ? (
              <Text variant="caption" color="textSecondary">
                {loadingText}
              </Text>
            ) : success ? (
              <View style={styles.inline}>
                <Icon name="success" size={16} color="success" />
                <Text variant="caption" color="success" style={styles.flex}>
                  {success}
                </Text>
              </View>
            ) : helper ? (
              <Text variant="caption" color={disabled ? 'textDisabled' : 'textSecondary'}>
                {helper}
              </Text>
            ) : null}
          </View>
          {showCounter ? (
            <Text variant="caption" color={atMax ? 'danger' : 'textSecondary'}>
              {`${length}/${maxLength}`}
            </Text>
          ) : null}
          {helperAction}
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: { gap: 8 },
  box: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  prefix: { marginRight: -2 },
  input: { flex: 1, paddingVertical: 12 },
  helperRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 18 },
  helperText: { flex: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  flex: { flex: 1 },
});
