import { GraphNode, GraphEdge } from './types';

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
