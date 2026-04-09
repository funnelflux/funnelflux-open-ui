import { theme } from 'antd'
import type { ThemeConfig } from 'antd'

/**
 * Ant Design theme configuration for FunnelFlux.
 * Values are hex duplicates of CSS vars in design-tokens.css.
 * Antd evaluates tokens at JS runtime and cannot read CSS vars.
 */

const sharedToken = {
  colorPrimary: '#2563EB',
  colorSuccess: '#16A34A',
  colorWarning: '#D97706',
  colorError: '#DC2626',
  colorInfo: '#3B82F6',
  fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  fontSize: 14,
  borderRadius: 6,
  controlHeight: 32,
  controlHeightSM: 24,
  controlHeightLG: 40,
}

const sharedComponents: ThemeConfig['components'] = {
  Button: {
    boxShadow: 'none',
    primaryShadow: 'none',
    fontWeight: 500,
    motionDurationMid: '0s',
    motionDurationSlow: '0s',
  },
  Table: {
    cellFontSize: 13,
    cellFontSizeMD: 13,
    cellFontSizeSM: 12,
  },
  Card: {
    paddingLG: 20,
  },
  Input: {
    controlHeight: 32,
    activeShadow: '0 0 0 2px rgba(37, 99, 235, 0.25)',
  },
  Select: {
    controlHeight: 32,
  },
  DatePicker: {
    controlHeight: 32,
  },
  InputNumber: {
    controlHeight: 32,
  },
  Segmented: {
    controlHeight: 32,
  },
  Tabs: {
    inkBarColor: '#2563EB',
  },
  Message: {
    contentBg: undefined, // use theme default
  },
}

export const lightTheme: ThemeConfig = {
  token: {
    ...sharedToken,
    colorBgContainer: '#FFFFFF',
    colorBgLayout: '#F8FAFC',
    colorBgElevated: '#FFFFFF',
    colorBorder: '#E2E8F0',
    colorBorderSecondary: '#F1F5F9',
    colorText: '#0F172A',
    colorTextSecondary: '#475569',
    colorTextTertiary: '#64748B',
    colorTextQuaternary: '#94A3B8',
    colorFillSecondary: '#F1F5F9',
    colorFillTertiary: '#F8FAFC',
  },
  components: {
    ...sharedComponents,
    Select: {
      ...sharedComponents.Select,
      optionSelectedBg: '#EFF6FF',
    },
  },
}

export const darkTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    ...sharedToken,
    colorBgContainer: '#1E293B',
    colorBgLayout: '#0F172A',
    colorBgElevated: '#1E293B',
    colorBorder: '#334155',
    colorBorderSecondary: '#1E293B',
    colorText: '#F8FAFC',
    colorTextSecondary: '#94A3B8',
    colorTextTertiary: '#64748B',
    colorTextQuaternary: '#475569',
    colorFillSecondary: '#1E293B',
    colorFillTertiary: '#0F172A',
  },
  components: {
    ...sharedComponents,
    Select: {
      ...sharedComponents.Select,
      optionSelectedBg: '#1E3A5F',
    },
  },
}

/* Chart colors for JS consumption (matches --ff-chart-* in design-tokens.css) */
export const CHART_COLORS = [
  '#3B82F6', '#8B5CF6', '#06B6D4', '#F97316', '#22C55E',
  '#EC4899', '#EAB308', '#6366F1', '#14B8A6', '#F43F5E',
] as const

export const PROFIT_COLOR = '#16A34A'
export const LOSS_COLOR = '#DC2626'
