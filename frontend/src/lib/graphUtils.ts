import { GraphNode, GraphEdge } from './types';

export const MASTERY_COLORS: Record<string, string> = {
  mastered: '#22c55e',
  learning: '#eab308',
  struggling: '#ef4444',
  unexplored: '#d1d5db',
  subject_root: '#6366f1',
};

export function getMasteryColor(tier: string): string {
  return MASTERY_COLORS[tier] ?? '#d1d5db';
}

export function getMasteryLabel(score: number): string {
  return `${Math.round(score * 100)}%`;
}

export function getNodeRadius(mastery_score: number): number {
  return 6 + mastery_score * 6; // 6 to 12
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
