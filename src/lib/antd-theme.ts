export { CHART_COLORS, LOSS_COLOR, PROFIT_COLOR } from '@/lib/chart-theme'

import { theme } from '@/components/ui-kit/antdTheme'
import type { ThemeConfig } from '@/components/ui-kit/antdTheme'

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
  borderRadius: 8,
  /** md — default toolbar / form control height */
  controlHeight: 35,
  controlHeightSM: 28,
  controlHeightLG: 42,
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
    controlHeight: 35,
    activeShadow: '0 0 0 2px rgba(37, 99, 235, 0.25)',
  },
  Select: {
    controlHeight: 35,
  },
  DatePicker: {
    controlHeight: 35,
  },
  InputNumber: {
    controlHeight: 35,
  },
  Segmented: {
    controlHeight: 35,
  },
  Tabs: {
    inkBarColor: '#2563EB',
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
    Message: {
      contentBg: '#FFFFFF',
      boxShadow: '0 6px 16px 0 rgba(15, 23, 42, 0.12), 0 3px 6px -4px rgba(15, 23, 42, 0.08)',
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
    /* Text-facing error tokens follow the AA-contrast dark ramp (--ff-error).
       Global colorError stays #DC2626 so danger-button fills keep white-text contrast. */
    colorErrorText: '#F87171',
    colorErrorTextHover: '#F87171',
    colorErrorTextActive: '#F87171',
  },
  components: {
    ...sharedComponents,
    Form: {
      /* Form reads token.colorError for explain/validation text. */
      colorError: '#F87171',
    },
    Select: {
      ...sharedComponents.Select,
      optionSelectedBg: '#1E3A5F',
    },
    Message: {
      contentBg: '#1E293B',
      boxShadow: '0 6px 16px 0 rgba(0, 0, 0, 0.32), 0 3px 6px -4px rgba(0, 0, 0, 0.48)',
    },
  },
}

