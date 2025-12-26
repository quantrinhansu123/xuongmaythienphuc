import { AppThemeProvider } from "@/providers/AppThemeProvider";
import ReactQueryProvider from "@/providers/ReactQueryProvider";
import React from "react";

const AppContext = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <ReactQueryProvider>
        <AppThemeProvider>{children}</AppThemeProvider>
      </ReactQueryProvider>
    </>
  );
};

export default AppContext;
