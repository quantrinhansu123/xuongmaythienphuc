import AppContext from "@/app/context";
import "@/styles/globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

export const metadata: Metadata = {
  title: "Quản Lý Xưởng May Thiên Phước",
  description:
    "Hệ thống quản lý sản xuất và tồn kho dành cho các xưởng may công nghiệp.",
  icons: {
    icon: "/favicon.ico",
  },
};

const font = Inter({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-inter",
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
});

export const viewport: Viewport = {
  colorScheme: "normal",
  themeColor: [
    {
      media: "(prefers-color-scheme: light)",
      color: "#F9F9F9",
    },
    {
      media: "(prefers-color-scheme: dark)",
      color: "#1f1d24",
    },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="vi" className="text-[12px] md:text-[14px] lg:text-[16px]">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>

      <body className={font.className} id="root">
        <AppContext>{children}</AppContext>
      </body>
    </html>
  );
};

export default RootLayout;
