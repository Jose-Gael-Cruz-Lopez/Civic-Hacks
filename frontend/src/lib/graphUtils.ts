import { GraphNode, GraphEdge } from './types';

// ── Course colour palette ─────────────────────────────────────────────────────
// Each unique subject/course name is deterministically hashed to one of these
// matte flat colours. Used for graph nodes AND calendar assignment chips.

export interface CourseColor {
  fill:   string; // solid node / dot colour
  bg:     string; // light tinted background
  text:   string; // readable foreground text
  border: string; // subtle border
}

const COURSE_COLOR_PALETTE: CourseColor[] = [
  { fill: '#6366f1', bg: 'rgba(99,102,241,0.12)',  text: '#4338ca', border: 'rgba(99,102,241,0.3)'  }, // indigo
  { fill: '#0d9488', bg: 'rgba(13,148,136,0.12)',  text: '#0f766e', border: 'rgba(13,148,136,0.3)'  }, // teal
  { fill: '#d97706', bg: 'rgba(217,119,6,0.12)',   text: '#b45309', border: 'rgba(217,119,6,0.3)'   }, // amber
  { fill: '#dc2626', bg: 'rgba(220,38,38,0.12)',   text: '#b91c1c', border: 'rgba(220,38,38,0.3)'   }, // red
  { fill: '#7c3aed', bg: 'rgba(124,58,237,0.12)',  text: '#6d28d9', border: 'rgba(124,58,237,0.3)'  }, // violet
  { fill: '#0891b2', bg: 'rgba(8,145,178,0.12)',   text: '#0e7490', border: 'rgba(8,145,178,0.3)'   }, // cyan
  { fill: '#65a30d', bg: 'rgba(101,163,13,0.12)',  text: '#4d7c0f', border: 'rgba(101,163,13,0.3)'  }, // lime
  { fill: '#db2777', bg: 'rgba(219,39,119,0.12)',  text: '#be185d', border: 'rgba(219,39,119,0.3)'  }, // pink
  { fill: '#ea580c', bg: 'rgba(234,88,12,0.12)',   text: '#c2410c', border: 'rgba(234,88,12,0.3)'   }, // orange
  { fill: '#059669', bg: 'rgba(5,150,105,0.12)',   text: '#047857', border: 'rgba(5,150,105,0.3)'   }, // emerald
  { fill: '#2563eb', bg: 'rgba(37,99,235,0.12)',   text: '#1d4ed8', border: 'rgba(37,99,235,0.3)'   }, // blue
  { fill: '#9333ea', bg: 'rgba(147,51,234,0.12)',  text: '#7e22ce', border: 'rgba(147,51,234,0.3)'  }, // purple
];

function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return Math.abs(h);
}

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return null;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return [r, g, b];
}

/** Build a CourseColor from any valid 6-digit hex string. */
export function hexToCourseColor(hex: string): CourseColor {
  const rgb = hexToRgb(hex);
  if (!rgb) return COURSE_COLOR_PALETTE[0];
  const [r, g, b] = rgb;
  return {
    fill: hex,
    bg: `rgba(${r},${g},${b},0.12)`,
    text: hex,
    border: `rgba(${r},${g},${b},0.3)`,
  };
}

/** Deterministically maps any subject/course name to a matte colour entry.
 *  Pass overrideHex to use a user-chosen colour instead of the hash default. */
export function getCourseColor(subject: string, overrideHex?: string | null): CourseColor {
  if (overrideHex && /^#[0-9a-fA-F]{6}$/.test(overrideHex)) {
    return hexToCourseColor(overrideHex);
  }
  const key = (subject ?? '').toLowerCase().trim();
  if (!key) return COURSE_COLOR_PALETTE[0];
  return COURSE_COLOR_PALETTE[hashString(key) % COURSE_COLOR_PALETTE.length];
}

/** The 12 preset fill colours exposed so the colour picker can list them. */
export const PRESET_COURSE_COLORS = COURSE_COLOR_PALETTE.map(c => c.fill);

// ── Mastery colours (still used in detail panels / tooltips) ─────────────────
// Forest green / light theme palette
export const MASTERY_COLORS: Record<string, string> = {
  mastered:     '#16a34a', // forest green
  learning:     '#d97706', // amber
  struggling:   '#dc2626', // red
  unexplored:   '#6b7280', // gray
  subject_root: '#7c3aed', // purple — hub nodes
};

// Lighter centre colour for the radial gradient inside each node
export const MASTERY_HIGHLIGHT_COLORS: Record<string, string> = {
  mastered:     '#86efac',
  learning:     '#fde68a',
  struggling:   '#fca5a5',
  unexplored:   '#e2e8f0',
  subject_root: '#ddd6fe',
};

export function getMasteryColor(tier: string): string {
  return MASTERY_COLORS[tier] ?? '#475569';
}

export function getMasteryHighlightColor(tier: string): string {
  return MASTERY_HIGHLIGHT_COLORS[tier] ?? '#94a3b8';
}

export function getMasteryLabel(score: number): string {
  return `${Math.round(score * 100)}%`;
}

export function getNodeRadius(mastery_score: number): number {
  return 7 + mastery_score * 7; // 7–14 px
}

export function computeGraphDiff(
  prevNodes: GraphNode[],
  nextNodes: GraphNode[],
  prevEdges: GraphEdge[],
  nextEdges: GraphEdge[]
): { newNodeIds: Set<string>; updatedNodeIds: Set<string>; newEdgeIds: Set<string> } {
  const prevNodeMap = new Map(prevNodes.map(n => [n.id, n]));
  const prevEdgeIds = new Set(prevEdges.map(e => e.id));

  const newNodeIds = new Set<string>();
  const updatedNodeIds = new Set<string>();

  for (const n of nextNodes) {
    const prev = prevNodeMap.get(n.id);
    if (!prev) {
      newNodeIds.add(n.id);
    } else if (prev.mastery_tier !== n.mastery_tier) {
      updatedNodeIds.add(n.id);
    }
  }

  const newEdgeIds = new Set<string>();
  for (const e of nextEdges) {
    if (!prevEdgeIds.has(e.id)) {
      newEdgeIds.add(e.id);
    }
  }

  return { newNodeIds, updatedNodeIds, newEdgeIds };
}

export function formatRelativeTime(isoDate: string | null): string {
  if (!isoDate) return 'Never';
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function formatDueDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function daysUntil(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - today.getTime()) / 86400000);
}
