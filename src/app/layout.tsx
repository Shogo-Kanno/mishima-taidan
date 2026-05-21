import { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "三島対談",
  description: "デジタル転生・三島由紀夫",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
