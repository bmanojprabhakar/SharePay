import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';

interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  style?: any;
}

export default function Checkbox({
  checked,
  onCheckedChange,
  label,
  disabled = false,
  style,
}: CheckboxProps) {
  const containerStyles = [
    styles.container,
    disabled && styles.disabled,
    style,
  ];

  const checkboxStyles = [
    styles.checkbox,
    checked && styles.checkboxChecked,
    disabled && styles.checkboxDisabled,
  ];

  return (
    <TouchableOpacity
      style={containerStyles}
      onPress={() => !disabled && onCheckedChange(!checked)}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={checkboxStyles}>
        {checked && (
          <Text style={styles.checkmark}>✓</Text>
        )}
      </View>
      {label && (
        <Text style={[styles.label, disabled && styles.labelDisabled]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.small,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxDisabled: {
    opacity: 0.6,
  },
  checkmark: {
    color: Colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  label: {
    marginLeft: Spacing.sm,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  labelDisabled: {
    color: Colors.textSecondary,
  },
  disabled: {
    opacity: 0.6,
  },
});