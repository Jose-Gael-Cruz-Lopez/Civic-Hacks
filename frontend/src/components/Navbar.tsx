'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/context/UserContext';

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
        <select
          value={userId}
          onChange={e => {
            const selected = users.find(u => u.id === e.target.value);
            if (selected) setActiveUser(selected.id, selected.name);
          }}
          style={{
            padding: '5px 10px',
            border: '1px solid rgba(148, 163, 184, 0.18)',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            color: '#f1f5f9',
            background: 'rgba(15, 23, 42, 0.85)',
            cursor: 'pointer',
            outline: 'none',
            minWidth: '120px',
          }}
        >
          {users.length === 0
            ? <option value={userId}>{userName}</option>
            : users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))
          }
        </select>
      </div>
    </nav>
  );
}
