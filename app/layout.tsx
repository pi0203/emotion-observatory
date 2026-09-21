import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "감정 관찰실",
  description: "몸, 상황, 의미를 천천히 구별해보는 자기관찰 도구",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
