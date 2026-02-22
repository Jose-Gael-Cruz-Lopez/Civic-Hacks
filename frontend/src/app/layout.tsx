import type { Metadata } from 'next';
import { Spectral, DM_Sans } from 'next/font/google';
import './globals.css';
import { UserProvider } from '@/context/UserContext';
import Navbar from '@/components/Navbar';
import SpaceBackground from '@/components/SpaceBackground';

const spectral = Spectral({
  subsets: ['latin'],
  weight: ['200', '300', '400', '500', '600', '700', '800'],
  style: ['normal', 'italic'],
  variable: '--font-spectral',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Sapling',
  description: 'Learn through conversation. Watch your knowledge grow.',
  icons: {
    icon: '/sapling-icon.svg',
    shortcut: '/sapling-icon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spectral.variable} ${dmSans.variable}`}>
      <body>
        <SpaceBackground />
        <UserProvider>
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Navbar />
            <main style={{ flex: 1 }}>{children}</main>
          </div>
        </UserProvider>
      </body>
    </html>
  );
}
