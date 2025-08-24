export const Colors = {
  primary: '#3B82F6', // Blue 500
  secondary: '#10B981', // Emerald 500
  accent: '#8B5CF6', // Violet 500
  background: '#F8FAFC', // Slate 50
  surface: '#FFFFFF',
  textPrimary: '#1E293B', // Slate 800
  textSecondary: '#64748B', // Slate 500
  error: '#EF4444', // Red 500
  success: '#10B981', // Emerald 500
  warning: '#F59E0B', // Amber 500
  border: '#E2E8F0', // Slate 200
  shadow: '#0F172A', // Slate 900
};

export const Typography = {
  headingLarge: {
    fontSize: 28,
    fontWeight: 'bold' as const,
  },
  headingMedium: {
    fontSize: 22,
    fontWeight: '600' as const,
  },
  headingSmall: {
    fontSize: 18,
    fontWeight: '500' as const,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  small: 8,
  medium: 12,
  large: 16,
  xl: 20,
};

export const Shadows = {
  small: {
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
};