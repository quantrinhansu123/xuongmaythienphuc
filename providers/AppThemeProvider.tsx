"use client";

import LoaderApp from "@/components/LoaderApp";
import { ThemeName, getThemeTokens, themeColors } from "@/configs/theme";
// breakpoint handling moved to client-only effect below to avoid hydration mismatch
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App as AntdApp, ConfigProvider, theme as antdTheme } from "antd";
import vi from "antd/locale/vi_VN";
import React, { createContext, useContext, useEffect, useState } from "react";
// Context để các component con có thể gọi hàm chuyển theme
type ThemeContextType = {
  mode: "light" | "dark";
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  mode: "light",
  themeName: "default",
  setThemeName: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const AppThemeProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [mode] = useState<"light" | "dark">(() => {
    return "light";
  });
  const [mounted, setMounted] = useState(false);

  const [themeName, setThemeName] = useState<ThemeName>(() => {
    if (typeof window !== "undefined") {
      const savedThemeName = localStorage.getItem("theme-name");
      return (savedThemeName as ThemeName) || "default";
    }
    return "default";
  });

  useEffect(() => {
    localStorage.setItem("theme-mode", mode);
    localStorage.setItem("theme-name", themeName);
  }, [mode, themeName]);

  useEffect(() => {
    const root = document.documentElement;

    root.classList.remove("light", "dark");
    root.classList.add(mode);

    const themeConfig = themeColors[themeName];

    root.style.setProperty("--primary", themeConfig.primary);
    root.style.setProperty(
      "--primary-foreground",
      themeConfig.primaryForeground
    );

    root.style.setProperty("--ring", themeConfig.primary);
    root.style.setProperty("--sidebar-primary", themeConfig.primary);
    root.style.setProperty(
      "--sidebar-primary-foreground",
      themeConfig.primaryForeground
    );
    root.style.setProperty("--sidebar-ring", themeConfig.primary);

    if (themeName === "default") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", themeName);
    }
  }, [mode, themeName]);

  const baseThemeTokens = getThemeTokens(themeName, mode);
  // Default to 'small' on the server to keep SSR output stable.
  // Update the real size on the client after mount to the appropriate value.
  const [componentSize, setComponentSize] = useState<"small" | "middle">(
    "small"
  );

  // Track client mount to avoid hydration warnings
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const MD_WIDTH = 768; // matches typical md breakpoint in useWindowBreakpoint

    const calc = () => {
      const w = typeof window !== "undefined" ? window.innerWidth : 0;
      setComponentSize(w <= MD_WIDTH ? "small" : "middle");
    };

    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  return (
    <AntdRegistry>
      <ThemeContext.Provider value={{ mode, themeName, setThemeName }}>
        <ConfigProvider
          locale={vi}
          spin={{
            indicator: <LoaderApp />,
          }}
          input={{
            autoComplete: "off",
          }}
          componentSize={componentSize}
          theme={{
            algorithm: antdTheme.defaultAlgorithm,
            token: {
              ...baseThemeTokens,
              fontFamily: "inherit",
            },
            components: {
              Layout: {
                headerBg: mode === "dark" ? "#27272a" : "#ffffff",
                footerBg: mode === "dark" ? "#27272a" : "#ffffff",
                siderBg: mode === "dark" ? "#27272a" : "#ffffff",
                triggerBg: mode === "dark" ? "#27272a" : "#ffffff",
                triggerColor: baseThemeTokens.colorPrimary,
                headerPadding: "0 24px",
              },
            },
          }}
        >
          <div suppressHydrationWarning>
            {mounted ? (
              <AntdApp>{children}</AntdApp>
            ) : (
              <div className="ant-app" />
            )}
          </div>
        </ConfigProvider>
      </ThemeContext.Provider>
    </AntdRegistry>
  );
};
