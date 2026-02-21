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

      {/* User switcher — right side, always visible */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <select
          value={userId}
          onChange={e => {
            const selected = users.find(u => u.id === e.target.value);
            if (selected) setActiveUser(selected.id, selected.name);
          }}
          style={{
            padding: '5px 10px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            color: '#111827',
            background: '#f9fafb',
            cursor: 'pointer',
            outline: 'none',
            minWidth: '120px',
          }}
        >
          {/* Always show at least the current user while the list loads */}
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
