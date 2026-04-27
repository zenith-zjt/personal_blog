import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "个人博客知识库",
  description: "公开知识库浏览前台，采用目录树组织 Markdown 内容。",
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
