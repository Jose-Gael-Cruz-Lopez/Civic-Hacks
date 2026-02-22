'use client';

import { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import { GraphNode, GraphEdge } from '@/lib/types';
import { getMasteryColor, getMasteryHighlightColor, getNodeRadius } from '@/lib/graphUtils';

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
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  concept_name: string;
  mastery_score: number;
  mastery_tier: string;
  subject: string;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  id: string;
  strength: number;
}

const TIERS = ['mastered', 'learning', 'struggling', 'unexplored'] as const;

export default function KnowledgeGraph({
  nodes,
  edges,
  width,
  height,
  animate = false,
  highlightId,
  interactive = true,
  onNodeClick,
  comparison,
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

    // ── Defs: glow filters + radial gradients ──────────────────────────────
    const defs = svg.append('defs');

    TIERS.forEach(tier => {
      const color = getMasteryColor(tier);
      const highlight = getMasteryHighlightColor(tier);
      const blurAmt = tier === 'unexplored' ? 2.5 : 5;

      // Glow filter
      const filter = defs.append('filter')
        .attr('id', `glow-${tier}`)
        .attr('x', '-80%').attr('y', '-80%')
        .attr('width', '260%').attr('height', '260%');
      filter.append('feGaussianBlur')
        .attr('in', 'SourceGraphic')
        .attr('stdDeviation', blurAmt)
        .attr('result', 'coloredBlur');
      const merge = filter.append('feMerge');
      merge.append('feMergeNode').attr('in', 'coloredBlur');
      merge.append('feMergeNode').attr('in', 'SourceGraphic');

      // Radial gradient (light centre → saturated edge)
      const grad = defs.append('radialGradient')
        .attr('id', `grad-${tier}`)
        .attr('cx', '35%').attr('cy', '30%').attr('r', '65%');
      grad.append('stop').attr('offset', '0%').attr('stop-color', highlight).attr('stop-opacity', '1');
      grad.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', '0.85');
    });

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
      .filter(e => nodeById.has(e.source) && nodeById.has(e.target))
      .map(e => ({ id: e.id, source: e.source, target: e.target, strength: e.strength }));

    const sim = d3.forceSimulation(simNodes)
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('link', d3.forceLink<SimNode, SimLink>(simLinks)
        .id(d => d.id)
        .distance(d => 70 + (1 - d.strength) * 60)
        .strength(d => d.strength * 0.6))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('collide', d3.forceCollide<SimNode>(d => getNodeRadius(d.mastery_score) + 10))
      .alphaDecay(0.03);

    simRef.current = sim;

    // ── Edges ──────────────────────────────────────────────────────────────
    const linkGroup = container.append('g').attr('class', 'links');
    const linkSel = linkGroup
      .selectAll<SVGLineElement, SimLink>('line')
      .data(simLinks, d => d.id)
      .enter()
      .append('line')
      .attr('stroke', 'rgba(148,163,184,0.13)')
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
          .attr('r', getNodeRadius(d.mastery_score) + 5)
          .attr('fill', 'none')
          .attr('stroke', outlineColor)
          .attr('stroke-width', 2);
      }
    });

    // Pulse ring for highlighted node
    if (highlightId) {
      nodeSel.filter(d => d.id === highlightId)
        .append('circle')
        .attr('r', d => getNodeRadius(d.mastery_score) + 8)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(34,211,238,0.45)')
        .attr('stroke-width', 1.5);
    }

    // Outer soft bloom (extra glow halo)
    nodeSel.append('circle')
      .attr('r', d => getNodeRadius(d.mastery_score) + 5)
      .attr('fill', d => getMasteryColor(d.mastery_tier))
      .attr('opacity', 0.12)
      .attr('filter', d => `url(#glow-${d.mastery_tier})`);

    // Main orb
    const circles = nodeSel.append('circle')
      .attr('r', d => getNodeRadius(d.mastery_score))
      .attr('fill', d => `url(#grad-${d.mastery_tier})`)
      .attr('filter', d => `url(#glow-${d.mastery_tier})`)
      .attr('stroke', 'rgba(255,255,255,0.18)')
      .attr('stroke-width', 1);

    // New-node entrance animation
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
            .attr('fill', `url(#grad-${currN.mastery_tier})`);
        }
      });
    }

    // Labels
    nodeSel.append('text')
      .text(d => d.concept_name)
      .attr('text-anchor', 'middle')
      .attr('dy', d => getNodeRadius(d.mastery_score) + 15)
      .attr('font-size', '11px')
      .attr('font-family', 'Inter, system-ui, sans-serif')
      .attr('fill', '#64748b')
      .attr('pointer-events', 'none')
      .style('user-select', 'none');

    // ── Interactions ────────────────────────────────────────────────────────
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
          tooltip.innerHTML = `
            <div style="font-weight:600;color:#f1f5f9;margin-bottom:4px">${sourceNode.concept_name}</div>
            <div style="color:${getMasteryColor(sourceNode.mastery_tier)};font-size:12px;margin-bottom:2px">${mastery}% mastery</div>
            <div style="color:#64748b;font-size:12px">Last studied: ${lastStudied}</div>
          `;
          tooltip.style.display = 'block';
          const rect = svgRef.current!.getBoundingClientRect();
          tooltip.style.left = `${event.clientX - rect.left + 14}px`;
          tooltip.style.top = `${event.clientY - rect.top - 12}px`;
          d3.select(this).select('circle:last-of-type')
            .attr('stroke', 'rgba(255,255,255,0.65)').attr('stroke-width', 2);
        })
        .on('mousemove', function(event) {
          if (!tooltip || !svgRef.current) return;
          const rect = svgRef.current.getBoundingClientRect();
          tooltip.style.left = `${event.clientX - rect.left + 14}px`;
          tooltip.style.top = `${event.clientY - rect.top - 12}px`;
        })
        .on('mouseout', function() {
          if (tooltip) tooltip.style.display = 'none';
          d3.select(this).select('circle:last-of-type')
            .attr('stroke', 'rgba(255,255,255,0.18)').attr('stroke-width', 1);
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
            if (!event.active) { sim.alphaTarget(0.3).restart(); }
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on('end', (event, d) => {
            if (!event.active) { sim.alphaTarget(0); }
            d.fx = null;
            d.fy = null;
          })
      );
    }

    // Tick
    sim.on('tick', () => {
      linkSel
        .attr('x1', d => (d.source as SimNode).x ?? 0)
        .attr('y1', d => (d.source as SimNode).y ?? 0)
        .attr('x2', d => (d.target as SimNode).x ?? 0)
        .attr('y2', d => (d.target as SimNode).y ?? 0);
      nodeSel.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    prevNodesRef.current = nodes;
    prevEdgesRef.current = edges;
    return () => { sim.stop(); };
  }, [nodes, edges, width, height, animate, highlightId, interactive, onNodeClick, getComparisonOutlineColor]);

  return (
    <div style={{ position: 'relative', width, height }}>
      <svg ref={svgRef} width={width} height={height} style={{ display: 'block' }} />
      {interactive && (
        <div
          ref={tooltipRef}
          style={{
            display: 'none',
            position: 'absolute',
            background: 'rgba(8, 13, 30, 0.88)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: '1px solid rgba(148, 163, 184, 0.14)',
            borderRadius: '8px',
            padding: '10px 12px',
            fontSize: '13px',
            pointerEvents: 'none',
            boxShadow: '0 0 24px rgba(34, 211, 238, 0.08)',
            zIndex: 10,
            maxWidth: '200px',
          }}
        />
      )}
    </div>
  );
}
