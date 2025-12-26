export const themeColors = {
  default: {
    primary: "#f97316",
    primaryForeground: "#fef3ec",
  },
  blue: {
    primary: "#3b82f6",
    primaryForeground: "#eff6ff",
  },
  yellow: {
    primary: "#eab308",
    primaryForeground: "#fefce8",
  },
  pink: {
    primary: "#db2777",
    primaryForeground: "#fef1f7",
  },
};

export type ThemeName = keyof typeof themeColors;

// Helper function để tạo theme tokens với primary color khác nhau
const createLightThemeTokens = (primaryColor: string) => ({
  colorPrimary: primaryColor,
  colorSuccess: "#10b981",
  colorWarning: "#f59e0b",
  colorError: "#ef4444",
  colorInfo: "#3b82f6",
  colorTextBase: "#18181b",
  colorBgBase: "#ffffff",

  // Success colors
  colorSuccessBg: "#ecfdf5",
  colorSuccessBgHover: "#d1fae5",
  colorSuccessBorder: "#6ee7b7",
  colorSuccessBorderHover: "#34d399",
  colorSuccessHover: "#059669",
  colorSuccessActive: "#047857",
  colorSuccessText: "#10b981",
  colorSuccessTextHover: "#059669",
  colorSuccessTextActive: "#047857",

  // Warning colors
  colorWarningBg: "#fffbeb",
  colorWarningBgHover: "#fef3c7",
  colorWarningBorder: "#fcd34d",
  colorWarningBorderHover: "#f59e0b",
  colorWarningHover: "#d97706",
  colorWarningActive: "#b45309",
  colorWarningText: "#f59e0b",
  colorWarningTextHover: "#d97706",
  colorWarningTextActive: "#b45309",

  // Error colors
  colorErrorBg: "#fef2f2",
  colorErrorBgHover: "#fecaca",
  colorErrorBorder: "#f87171",
  colorErrorBorderHover: "#ef4444",
  colorErrorHover: "#dc2626",
  colorErrorActive: "#b91c1c",
  colorErrorText: "#ef4444",
  colorErrorTextHover: "#dc2626",
  colorErrorTextActive: "#b91c1c",

  // Info colors
  colorInfoBg: "#eff6ff",
  colorInfoBgHover: "#dbeafe",
  colorInfoBorder: "#93c5fd",
  colorInfoBorderHover: "#3b82f6",
  colorInfoHover: "#2563eb",
  colorInfoActive: "#1d4ed8",
  colorInfoText: "#3b82f6",
  colorInfoTextHover: "#2563eb",
  colorInfoTextActive: "#1d4ed8",

  // Text colors
  colorText: "rgba(24, 24, 27, 0.9)",
  colorTextSecondary: "rgba(24, 24, 27, 0.7)",
  colorTextTertiary: "rgba(24, 24, 27, 0.5)",
  colorTextQuaternary: "rgba(24, 24, 27, 0.3)",
  colorTextDisabled: "rgba(24, 24, 27, 0.25)",

  // Background colors
  colorBgContainer: "#ffffff",
  colorBgElevated: "#ffffff",
  colorBgLayout: "#fafafa",
  colorBgSpotlight: "rgba(24, 24, 27, 0.85)",
  colorBgMask: "rgba(24, 24, 27, 0.45)",

  // Border colors
  colorBorder: "#e4e4e7",
  colorBorderSecondary: "#f4f4f5",

  // Border radius
  borderRadius: 10,
  borderRadiusXS: 2,
  borderRadiusSM: 6,
  borderRadiusLG: 14,

  // Spacing
  padding: 16,
  paddingSM: 12,
  paddingLG: 20,
  margin: 16,
  marginSM: 12,
  marginLG: 20,

  // Shadows
  boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
  boxShadowSecondary: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
});

const createDarkThemeTokens = (primaryColor: string) => ({
  colorPrimary: primaryColor,
  colorSuccess: "#10b981",
  colorWarning: "#f59e0b",
  colorError: "#ef4444",
  colorInfo: "#3b82f6",
  colorTextBase: "#fafafa",
  colorBgBase: "#18181b",


  // Success colors
  colorSuccessBg: "#022c22",
  colorSuccessBgHover: "#064e3b",
  colorSuccessBorder: "#047857",
  colorSuccessBorderHover: "#059669",
  colorSuccessHover: "#10b981",
  colorSuccessActive: "#34d399",
  colorSuccessText: "#34d399",
  colorSuccessTextHover: "#10b981",
  colorSuccessTextActive: "#059669",

  // Warning colors
  colorWarningBg: "#451a03",
  colorWarningBgHover: "#78350f",
  colorWarningBorder: "#92400e",
  colorWarningBorderHover: "#b45309",
  colorWarningHover: "#d97706",
  colorWarningActive: "#f59e0b",
  colorWarningText: "#fbbf24",
  colorWarningTextHover: "#f59e0b",
  colorWarningTextActive: "#d97706",

  // Error colors
  colorErrorBg: "#450a0a",
  colorErrorBgHover: "#7f1d1d",
  colorErrorBorder: "#991b1b",
  colorErrorBorderHover: "#b91c1c",
  colorErrorHover: "#dc2626",
  colorErrorActive: "#ef4444",
  colorErrorText: "#f87171",
  colorErrorTextHover: "#ef4444",
  colorErrorTextActive: "#dc2626",

  // Info colors
  colorInfoBg: "#172554",
  colorInfoBgHover: "#1e3a8a",
  colorInfoBorder: "#1e40af",
  colorInfoBorderHover: "#1d4ed8",
  colorInfoHover: "#2563eb",
  colorInfoActive: "#3b82f6",
  colorInfoText: "#60a5fa",
  colorInfoTextHover: "#3b82f6",
  colorInfoTextActive: "#2563eb",

  // Text colors
  colorText: "rgba(250, 250, 250, 0.9)",
  colorTextSecondary: "rgba(250, 250, 250, 0.7)",
  colorTextTertiary: "rgba(250, 250, 250, 0.5)",
  colorTextQuaternary: "rgba(250, 250, 250, 0.3)",
  colorTextDisabled: "rgba(250, 250, 250, 0.25)",

  // Background colors
  colorBgContainer: "#27272a",
  colorBgElevated: "#27272a",
  colorBgLayout: "#18181b",
  colorBgMask: "rgba(0, 0, 0, 0.65)",

  // Border colors
  colorBorder: "rgba(255, 255, 255, 0.1)",
  colorBorderSecondary: "rgba(255, 255, 255, 0.06)",

  // Border radius
  borderRadius: 10,
  borderRadiusXS: 2,
  borderRadiusSM: 6,
  borderRadiusLG: 14,

  // Spacing
  padding: 16,
  paddingSM: 12,
  paddingLG: 20,
  margin: 16,
  marginSM: 12,
  marginLG: 20,

  // Shadows
  boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.3)",
  boxShadowSecondary: "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.3)",
});

// Export theme tokens cho từng theme
export const getThemeTokens = (themeName: ThemeName, mode: "light" | "dark") => {
  const config = themeColors[themeName];

  if (mode === "light") {
    return createLightThemeTokens(config.primary);
  } else {
    return createDarkThemeTokens(config.primary);
  }
};
