import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';

export interface RadioOption {
  label: string;
  value: string;
}

interface RadioGroupProps {
  value: string;
  onValueChange: (value: string) => void;
  options: RadioOption[];
  disabled?: boolean;
  direction?: 'row' | 'column';
  style?: any;
}

export default function RadioGroup({
  value,
  onValueChange,
  options,
  disabled = false,
  direction = 'column',
  style,
}: RadioGroupProps) {
  const containerStyles = [
    styles.container,
    direction === 'row' && styles.containerRow,
    style,
  ];

  return (
    <View style={containerStyles}>
      {options.map((option) => (
        <RadioItem
          key={option.value}
          option={option}
          selected={value === option.value}
          onSelect={() => !disabled && onValueChange(option.value)}
          disabled={disabled}
        />
      ))}
    </View>
  );
}

interface RadioItemProps {
  option: RadioOption;
  selected: boolean;
  onSelect: () => void;
  disabled: boolean;
}

function RadioItem({ option, selected, onSelect, disabled }: RadioItemProps) {
  const itemStyles = [
    styles.radioItem,
    disabled && styles.radioItemDisabled,
  ];

  const radioStyles = [
    styles.radio,
    selected && styles.radioSelected,
    disabled && styles.radioDisabled,
  ];

  return (
    <TouchableOpacity
      style={itemStyles}
      onPress={onSelect}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={radioStyles}>
        {selected && <View style={styles.radioDot} />}
      </View>
      <Text style={[styles.label, disabled && styles.labelDisabled]}>
        {option.label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  containerRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  radioItemDisabled: {
    opacity: 0.6,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  radioSelected: {
    borderColor: Colors.primary,
  },
  radioDisabled: {
    opacity: 0.6,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  label: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  labelDisabled: {
    color: Colors.textSecondary,
  },
});