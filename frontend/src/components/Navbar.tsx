'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/learn', label: 'Learn' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/social', label: 'Social' },
  { href: '/tree', label: 'Tree' },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        borderBottom: '1px solid #e5e7eb',
        background: '#ffffff',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '32px',
        height: '48px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <span style={{ fontWeight: 600, fontSize: '16px', color: '#111827', letterSpacing: '-0.02em' }}>
        Sapling
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {LINKS.map(link => {
          const active = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                padding: '4px 10px',
                fontSize: '14px',
                color: active ? '#111827' : '#6b7280',
                fontWeight: active ? 500 : 400,
                textDecoration: 'none',
                borderRadius: '4px',
                borderBottom: active ? '2px solid #111827' : '2px solid transparent',
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
