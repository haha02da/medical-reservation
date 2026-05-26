import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '진료 예약 시스템',
  description: 'AI 기반 스마트 진료 예약 서비스',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-slate-100 min-h-screen">{children}</body>
    </html>
  );
}
