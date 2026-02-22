'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import CustomSelect from '@/components/CustomSelect';

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/learn', label: 'Learn' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/social', label: 'Social' },
  { href: '/tree', label: 'Tree' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { userId, userName, users, setActiveUser } = useUser();

  return (
    <nav
      style={{
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(107, 114, 128, 0.12)',
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
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
        <img src="/sapling-icon.svg" alt="Sapling" style={{ width: '32px', height: '32px' }} />
        <span style={{
          fontFamily: "var(--font-spectral), 'Spectral', Georgia, serif",
          fontWeight: 700,
          fontSize: '20px',
          color: '#1a5c2a',
          letterSpacing: '-0.02em',
          textShadow: '0 0 12px rgba(26, 92, 42, 0.2)',
        }}>
          Sapling
        </span>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        {LINKS.map(link => {
          const active = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className="nav-link"
              style={{
                padding: '4px 12px',
                fontSize: '13px',
                color: active ? '#1a5c2a' : '#9ca3af',
                fontWeight: active ? 600 : 400,
                textDecoration: 'none',
                borderRadius: '5px',
                borderBottom: 'none',
                background: active ? 'rgba(26, 92, 42, 0.10)' : 'transparent',
                fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
                letterSpacing: '0.2px',
                transition: 'color 0.15s, background 0.15s',
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
        <CustomSelect
          value={userId}
          onChange={val => {
            const u = users.find(u => u.id === val);
            if (u) setActiveUser(u.id, u.name);
          }}
          options={
            users.length === 0
              ? [{ value: userId, label: userName }]
              : users.map(u => ({ value: u.id, label: u.name }))
          }
          style={{ minWidth: '130px' }}
        />
      </div>
    </nav>
  );
}
