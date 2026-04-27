import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "个人博客知识库 - 阶段 1",
  description: "阶段 1：内容域与文件系统能力验证页面",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
