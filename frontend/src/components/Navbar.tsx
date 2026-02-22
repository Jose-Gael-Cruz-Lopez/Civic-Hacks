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
        background: 'rgba(3, 7, 18, 0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
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
      <span style={{
        fontWeight: 700,
        fontSize: '16px',
        color: '#22d3ee',
        letterSpacing: '-0.02em',
        textShadow: '0 0 18px rgba(34, 211, 238, 0.55)',
      }}>
        Sapling
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        {LINKS.map(link => {
          const active = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                padding: '4px 12px',
                fontSize: '13px',
                color: active ? '#f1f5f9' : '#64748b',
                fontWeight: active ? 500 : 400,
                textDecoration: 'none',
                borderRadius: '5px',
                borderBottom: active ? '2px solid rgba(34, 211, 238, 0.65)' : '2px solid transparent',
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
