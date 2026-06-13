import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "멀티 대시보드",
  description: "멀티 사이트 준비 자동화와 배포 상태를 확인하는 운영 대시보드",
  metadataBase: new URL("https://multi-dashboard.vercel.app"),
  alternates: {
    canonical: "/",
  },
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "멀티 대시보드",
    description: "멀티 사이트 준비 자동화와 배포 상태를 확인하는 운영 대시보드",
    locale: "ko_KR",
    type: "website",
  },
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
