import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Hệ thống quản lý Liên Chi hội",
  description: "Hệ thống quản lý Liên Chi hội Khoa Sư phạm",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="antialiased">{children}</body>
    </html>
  );
}