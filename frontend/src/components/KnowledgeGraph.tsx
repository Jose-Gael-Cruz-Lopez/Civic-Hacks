'use client';

import { useRef, useEffect, useCallback, memo } from 'react';
import * as d3 from 'd3';
import { GraphNode, GraphEdge } from '@/lib/types';
import { getMasteryColor, getNodeRadius, getCourseColor } from '@/lib/graphUtils';

interface KnowledgeGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width: number;
  height: number;
  animate?: boolean;
  highlightId?: string;
  interactive?: boolean;
  onNodeClick?: (node: GraphNode) => void;
  comparison?: {
    partnerNodes: GraphNode[];
  };
  courseColorMap?: Record<string, string>;
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  concept_name: string;
  mastery_score: number;
  mastery_tier: string;
  subject: string;
  is_subject_root?: boolean;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  id: string;
  strength: number;
}

const ROOT_RADIUS = 22;
const getSimRadius = (d: SimNode) =>
  d.is_subject_root ? ROOT_RADIUS : getNodeRadius(d.mastery_score);

/** Opacity encodes mastery tier — full colour = mastered, ghost = unexplored. */
function masteryOpacity(tier: string): number {
  switch (tier) {
    case 'mastered':     return 1.0;
    case 'learning':     return 0.75;
    case 'struggling':   return 0.55;
    case 'unexplored':   return 0.28;
    case 'subject_root': return 1.0;
    default:             return 0.65;
  }
}

function KnowledgeGraph({
  nodes,
  edges,
  width,
  height,
  animate = false,
  highlightId,
  interactive = true,
  onNodeClick,
  comparison,
  courseColorMap = {},
}: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const prevNodesRef = useRef<GraphNode[]>([]);
  const prevEdgesRef = useRef<GraphEdge[]>([]);

  const getComparisonOutlineColor = useCallback(
    (node: GraphNode): string | null => {
      if (!comparison) return null;
      const partnerNode = comparison.partnerNodes.find(n => n.concept_name === node.concept_name);
      if (!partnerNode) return null;
      const myM = node.mastery_score;
      const theirM = partnerNode.mastery_score;
      if (myM > 0.7 && theirM < 0.5) return '#38bdf8';
      if (theirM > 0.7 && myM < 0.5) return '#fb923c';
      if (myM < 0.5 && theirM < 0.5) return '#f87171';
      if (myM > 0.7 && theirM > 0.7) return '#34d399';
      return null;
    },
    [comparison]
  );

  useEffect(() => {
    if (!svgRef.current || !width || !height) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // ── Layout ─────────────────────────────────────────────────────────────
    const container = svg.append('g').attr('class', 'graph-container');

    if (interactive) {
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 3])
        .on('zoom', event => container.attr('transform', event.transform.toString()));
      svg.call(zoom);
    }

    const simNodes: SimNode[] = nodes.map(n => ({
      ...n,
      x: (n as any).x ?? width / 2 + (Math.random() - 0.5) * 200,
      y: (n as any).y ?? height / 2 + (Math.random() - 0.5) * 200,
    }));

    const nodeById = new Map(simNodes.map(n => [n.id, n]));
    const simLinks: SimLink[] = edges
      .filter(e => nodeById.has(e.source as string) && nodeById.has(e.target as string))
      .map(e => ({
        id: e.id,
        source: e.source as string,
        target: e.target as string,
        strength: e.strength,
      }));

    const sim = d3.forceSimulation(simNodes)
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.04))
      .force('x', d3.forceX(width / 2).strength(0.03))
      .force('y', d3.forceY(height / 2).strength(0.03))
      .force('link', d3.forceLink<SimNode, SimLink>(simLinks)
        .id(d => d.id)
        .distance(d => 55 + (1 - d.strength) * 40)
        .strength(d => d.strength * 0.8))
      .force('charge', d3.forceManyBody().strength(-120))
      .force('collide', d3.forceCollide<SimNode>(d => getSimRadius(d) + 8))
      .alphaDecay(0.04);

    simRef.current = sim;

    // ── Drift animation setup ───────────────────────────────────────────────
    // driftOffset is added on top of sim positions at render time — never mutates n.x/n.y
    let rafId = 0;
    let draggingId: string | null = null;
    const driftOffset = new Map<string, { dx: number; dy: number }>(
      simNodes.map(n => [n.id, { dx: 0, dy: 0 }])
    );
    const driftParams = new Map(simNodes.map(n => [n.id, {
      phaseX: Math.random() * Math.PI * 2,
      phaseY: Math.random() * Math.PI * 2,
      freqX:  0.00040 + Math.random() * 0.00030,
      freqY:  0.00032 + Math.random() * 0.00028,
      amp:    7 + Math.random() * 7,
    }]));

    // ── Edges ──────────────────────────────────────────────────────────────
    const linkGroup = container.append('g').attr('class', 'links');
    const linkSel = linkGroup
      .selectAll<SVGLineElement, SimLink>('line')
      .data(simLinks, d => d.id)
      .enter()
      .append('line')
      .attr('stroke', 'rgba(107,114,128,0.2)')
      .attr('stroke-width', d => 0.5 + d.strength * 1.2)
      .attr('stroke-linecap', 'round');

    if (animate) {
      const prevEdgeIds = new Set(prevEdgesRef.current.map(e => e.id));
      simLinks.forEach(l => {
        if (!prevEdgeIds.has(l.id)) {
          const el = linkSel.filter(d => d.id === l.id);
          el.attr('stroke-dasharray', '100 100').attr('stroke-dashoffset', 100)
            .transition().duration(300).attr('stroke-dashoffset', 0)
            .on('end', () => el.attr('stroke-dasharray', null).attr('stroke-dashoffset', null));
        }
      });
    }

    // ── Nodes ──────────────────────────────────────────────────────────────
    const nodeGroup = container.append('g').attr('class', 'nodes');
    const nodeSel = nodeGroup
      .selectAll<SVGGElement, SimNode>('g')
      .data(simNodes, d => d.id)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', interactive ? 'pointer' : 'default');

    // Comparison outline ring
    nodeSel.each(function(d) {
      const sourceNode = nodes.find(n => n.id === d.id);
      if (!sourceNode) return;
      const outlineColor = getComparisonOutlineColor(sourceNode);
      if (outlineColor) {
        d3.select(this).append('circle')
          .attr('r', getSimRadius(d) + 5)
          .attr('fill', 'none')
          .attr('stroke', outlineColor)
          .attr('stroke-width', 2);
      }
    });

    // ── Main orb — matte flat colour by course, opacity = mastery ──────────
    const circles = nodeSel.append('circle')
      .attr('class', 'main-circle')
      .attr('r', d => getSimRadius(d))
      .attr('fill', d => getCourseColor(d.subject, courseColorMap[d.subject]).fill)
      .attr('fill-opacity', d => masteryOpacity(d.mastery_tier))
      .attr('stroke', d => getCourseColor(d.subject, courseColorMap[d.subject]).fill)
      .attr('stroke-opacity', d => d.is_subject_root ? 0.7 : 0.4)
      .attr('stroke-width', d => d.is_subject_root ? 2.5 : 1.5);

    if (animate) {
      const prevNodeIds = new Set(prevNodesRef.current.map(n => n.id));
      simNodes.forEach(n => {
        if (!prevNodeIds.has(n.id)) {
          nodeSel.filter(d => d.id === n.id)
            .style('opacity', 0)
            .transition().duration(400)
            .style('opacity', 1);
        }
      });

      prevNodesRef.current.forEach(prevN => {
        const currN = nodes.find(n => n.id === prevN.id);
        if (currN && currN.mastery_tier !== prevN.mastery_tier) {
          circles.filter(d => d.id === currN.id)
            .transition().duration(500)
            .attr('fill-opacity', masteryOpacity(currN.mastery_tier));
        }
      });
    }

    // Labels
    nodeSel.append('text')
      .text(d => d.concept_name)
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.is_subject_root ? getSimRadius(d) + 17 : getSimRadius(d) + 15)
      .attr('font-size', d => d.is_subject_root ? '13px' : '11px')
      .attr('font-weight', d => d.is_subject_root ? '600' : '400')
      .attr('font-family', "'DM Sans', Inter, system-ui, sans-serif")
      .attr('fill', d => d.is_subject_root ? getCourseColor(d.subject, courseColorMap[d.subject]).text : '#374151')
      .attr('pointer-events', 'none')
      .style('user-select', 'none');

    // ── Interactions ───────────────────────────────────────────────────────
    if (interactive && tooltipRef.current) {
      const tooltip = tooltipRef.current;

      nodeSel
        .on('mouseover', function(event, d) {
          const sourceNode = nodes.find(n => n.id === d.id);
          if (!sourceNode || !tooltip) return;
          const mastery = Math.round(sourceNode.mastery_score * 100);
          const lastStudied = sourceNode.last_studied_at
            ? new Date(sourceNode.last_studied_at).toLocaleDateString()
            : 'Never';
          const cc = getCourseColor(sourceNode.subject, courseColorMap[sourceNode.subject]);
          tooltip.innerHTML = `
            <div style="font-weight:600;color:#111827;margin-bottom:4px">${sourceNode.concept_name}</div>
            <div style="display:flex;align-items:center;gap:5px;margin-bottom:4px">
              <span style="width:8px;height:8px;border-radius:50%;background:${cc.fill};display:inline-block;flex-shrink:0"></span>
              <span style="color:${cc.text};font-size:12px">${sourceNode.subject}</span>
            </div>
            <div style="color:${getMasteryColor(sourceNode.mastery_tier)};font-size:12px;margin-bottom:2px">${mastery}% mastery</div>
            <div style="color:#6b7280;font-size:12px">Last studied: ${lastStudied}</div>
          `;
          tooltip.style.display = 'block';
          const rect = svgRef.current!.getBoundingClientRect();
          tooltip.style.left = `${event.clientX - rect.left + 14}px`;
          tooltip.style.top = `${event.clientY - rect.top - 12}px`;
          d3.select(this).select('.main-circle')
            .attr('stroke-opacity', 1)
            .attr('stroke-width', 2.5);
        })
        .on('mousemove', function(event) {
          if (!tooltip || !svgRef.current) return;
          const rect = svgRef.current.getBoundingClientRect();
          tooltip.style.left = `${event.clientX - rect.left + 14}px`;
          tooltip.style.top = `${event.clientY - rect.top - 12}px`;
        })
        .on('mouseout', function(_, d) {
          if (tooltip) tooltip.style.display = 'none';
          d3.select(this).select('.main-circle')
            .attr('stroke-opacity', (d as SimNode).is_subject_root ? 0.7 : 0.4)
            .attr('stroke-width', (d as SimNode).is_subject_root ? 2.5 : 1.5);
        })
        .on('click', (_, d) => {
          const sourceNode = nodes.find(n => n.id === d.id);
          if (sourceNode && onNodeClick) onNodeClick(sourceNode);
        });
    }

    // Drag
    if (interactive) {
      nodeSel.call(
        d3.drag<SVGGElement, SimNode>()
          .on('start', (event, d) => {
            draggingId = d.id;
            if (!event.active) sim.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on('end', (event, d) => {
            draggingId = null;
            if (!event.active) sim.alphaTarget(0);
            d.fx = null; d.fy = null;
          })
      );
    }

    // Shared render: sim positions + drift offsets applied together
    const render = () => {
      linkSel
        .attr('x1', d => ((d.source as SimNode).x ?? 0) + (driftOffset.get((d.source as SimNode).id)?.dx ?? 0))
        .attr('y1', d => ((d.source as SimNode).y ?? 0) + (driftOffset.get((d.source as SimNode).id)?.dy ?? 0))
        .attr('x2', d => ((d.target as SimNode).x ?? 0) + (driftOffset.get((d.target as SimNode).id)?.dx ?? 0))
        .attr('y2', d => ((d.target as SimNode).y ?? 0) + (driftOffset.get((d.target as SimNode).id)?.dy ?? 0));
      nodeSel.attr('transform', d => {
        const o = driftOffset.get(d.id) ?? { dx: 0, dy: 0 };
        return `translate(${(d.x ?? 0) + o.dx},${(d.y ?? 0) + o.dy})`;
      });
    };

    // Drive render from sim ticks (fast, during layout phase)
    sim.on('tick', render);

    // RAF loop starts immediately — drift begins as soon as nodes appear
    const driftTick = (t: number) => {
      driftParams.forEach((p, id) => {
        const o = driftOffset.get(id)!;
        if (id === draggingId) { o.dx = 0; o.dy = 0; return; }
        o.dx = Math.sin(t * p.freqX + p.phaseX) * p.amp;
        o.dy = Math.cos(t * p.freqY + p.phaseY) * p.amp;
      });
      render();
      rafId = requestAnimationFrame(driftTick);
    };
    rafId = requestAnimationFrame(driftTick);

    prevNodesRef.current = nodes;
    prevEdgesRef.current = edges;
    return () => {
      sim.stop();
      cancelAnimationFrame(rafId);
    };
  }, [nodes, edges, width, height, animate, interactive, onNodeClick, getComparisonOutlineColor, courseColorMap]);

  // Separate lightweight effect: only add/remove the highlight ring.
  // Runs independently so changing highlightId never restarts the simulation.
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('.highlight-ring').remove();
    if (highlightId) {
      svg.selectAll<SVGGElement, SimNode>('.node')
        .filter(d => d.id === highlightId)
        .insert('circle', '.main-circle')
        .attr('class', 'highlight-ring')
        .attr('r', d => getSimRadius(d) + 8)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(26,92,42,0.55)')
        .attr('stroke-width', 2);
    }
  }, [highlightId]);

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block' }}
      />
      {interactive && (
        <div
          ref={tooltipRef}
          style={{
            display: 'none',
            position: 'absolute',
            background: 'rgba(255, 255, 255, 0.97)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: '1px solid rgba(107, 114, 128, 0.18)',
            borderRadius: '8px',
            padding: '10px 12px',
            fontSize: '13px',
            pointerEvents: 'none',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            zIndex: 10,
            maxWidth: '200px',
          }}
        />
      )}
    </div>
  );
}

export default memo(KnowledgeGraph);
