'use client';

import { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import { GraphNode, GraphEdge } from '@/lib/types';
import { getMasteryColor, getNodeRadius } from '@/lib/graphUtils';

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
  is_subject_root?: boolean;
}

const ROOT_RADIUS = 22;
const getSimRadius = (d: SimNode) =>
  d.is_subject_root ? ROOT_RADIUS : getNodeRadius(d.mastery_score);

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  id: string;
  strength: number;
}

type TooltipState = { x: number; y: number; node: GraphNode } | null;

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

      if (myM > 0.7 && theirM < 0.5) return '#3b82f6'; // blue: you can teach
      if (theirM > 0.7 && myM < 0.5) return '#f97316'; // orange: they can teach
      if (myM < 0.5 && theirM < 0.5) return '#ef4444'; // red: shared struggle
      if (myM > 0.7 && theirM > 0.7) return '#22c55e'; // green: shared strength
      return null;
    },
    [comparison]
  );

  useEffect(() => {
    if (!svgRef.current || !width || !height) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const container = svg.append('g').attr('class', 'graph-container');

    if (interactive) {
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 3])
        .on('zoom', (event) => {
          container.attr('transform', event.transform.toString());
        });
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
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force(
        'link',
        d3.forceLink<SimNode, SimLink>(simLinks)
          .id(d => d.id)
          .distance(d => 60 + (1 - d.strength) * 60)
          .strength(d => d.strength * 0.6)
      )
      .force('charge', d3.forceManyBody().strength(-180))
      .force('collide', d3.forceCollide<SimNode>(d => getSimRadius(d) + 8))
      .alphaDecay(0.03);

    simRef.current = sim;

    // Edge layer
    const linkGroup = container.append('g').attr('class', 'links');
    const linkSel = linkGroup
      .selectAll<SVGLineElement, SimLink>('line')
      .data(simLinks, d => d.id)
      .enter()
      .append('line')
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', d => 1 + d.strength * 1.5)
      .attr('stroke-linecap', 'round');

    // New edge animation
    if (animate) {
      const prevEdgeIds = new Set(prevEdgesRef.current.map(e => e.id));
      simLinks.forEach(l => {
        if (!prevEdgeIds.has(l.id)) {
          const el = linkSel.filter(d => d.id === l.id);
          const len = 100;
          el.attr('stroke-dasharray', `${len} ${len}`)
            .attr('stroke-dashoffset', len)
            .transition()
            .duration(300)
            .attr('stroke-dashoffset', 0)
            .on('end', () => el.attr('stroke-dasharray', null).attr('stroke-dashoffset', null));
        }
      });
    }

    // Node layer
    const nodeGroup = container.append('g').attr('class', 'nodes');
    const nodeSel = nodeGroup
      .selectAll<SVGGElement, SimNode>('g')
      .data(simNodes, d => d.id)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', interactive ? 'pointer' : 'default');

    // Outer ring for comparison mode
    nodeSel.each(function(d) {
      const g = d3.select(this);
      const sourceNode = nodes.find(n => n.id === d.id);
      if (!sourceNode) return;

      const outlineColor = getComparisonOutlineColor(sourceNode);
      if (outlineColor) {
        g.append('circle')
          .attr('r', getSimRadius(d) + 4)
          .attr('fill', 'none')
          .attr('stroke', outlineColor)
          .attr('stroke-width', 2.5);
      }
    });

    // Pulse ring for highlighted node
    if (highlightId) {
      nodeSel
        .filter(d => d.id === highlightId)
        .append('circle')
        .attr('class', 'pulse-ring')
        .attr('r', d => getSimRadius(d) + 6)
        .attr('fill', 'none')
        .attr('stroke', '#6b7280')
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.5);
    }

    // Main circles
    const circles = nodeSel
      .append('circle')
      .attr('r', d => getSimRadius(d))
      .attr('fill', d => getMasteryColor(d.mastery_tier))
      .attr('stroke', d => d.is_subject_root ? 'rgba(255,255,255,0.6)' : '#ffffff')
      .attr('stroke-width', d => d.is_subject_root ? 3 : 2);

    // New node animation
    if (animate) {
      const prevNodeIds = new Set(prevNodesRef.current.map(n => n.id));
      simNodes.forEach(n => {
        if (!prevNodeIds.has(n.id)) {
          const el = nodeSel.filter(d => d.id === n.id);
          el.style('opacity', 0)
            .style('transform', 'scale(0.5)')
            .transition()
            .duration(400)
            .style('opacity', 1)
            .style('transform', 'scale(1)');
        }
      });

      // Color transitions for updated nodes
      prevNodesRef.current.forEach(prevN => {
        const currN = nodes.find(n => n.id === prevN.id);
        if (currN && currN.mastery_tier !== prevN.mastery_tier) {
          circles
            .filter(d => d.id === currN.id)
            .transition()
            .duration(500)
            .attr('fill', getMasteryColor(currN.mastery_tier));
        }
      });
    }

    // Labels
    nodeSel
      .append('text')
      .text(d => d.concept_name)
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.is_subject_root ? getSimRadius(d) + 16 : getSimRadius(d) + 14)
      .attr('font-size', d => d.is_subject_root ? '13px' : '11px')
      .attr('font-weight', d => d.is_subject_root ? '600' : '400')
      .attr('font-family', 'Inter, system-ui, sans-serif')
      .attr('fill', d => d.is_subject_root ? '#374151' : '#6b7280')
      .attr('pointer-events', 'none')
      .style('user-select', 'none');

    // Tooltip and interactions
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
            <div style="font-weight:500;color:#111827;margin-bottom:4px">${sourceNode.concept_name}</div>
            <div style="color:#6b7280;font-size:12px">${mastery}% mastery</div>
            <div style="color:#9ca3af;font-size:12px">Last studied: ${lastStudied}</div>
          `;
          tooltip.style.display = 'block';

          const svgRect = svgRef.current!.getBoundingClientRect();
          const x = event.clientX - svgRect.left;
          const y = event.clientY - svgRect.top;
          tooltip.style.left = `${x + 12}px`;
          tooltip.style.top = `${y - 10}px`;

          d3.select(this).select('circle').attr('stroke', '#9ca3af').attr('stroke-width', 3);
        })
        .on('mousemove', function(event) {
          if (!tooltip || !svgRef.current) return;
          const svgRect = svgRef.current.getBoundingClientRect();
          tooltip.style.left = `${event.clientX - svgRect.left + 12}px`;
          tooltip.style.top = `${event.clientY - svgRect.top - 10}px`;
        })
        .on('mouseout', function() {
          if (tooltip) tooltip.style.display = 'none';
          d3.select(this).select('circle').attr('stroke', '#ffffff').attr('stroke-width', 2);
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
            if (!event.active) sim.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) sim.alphaTarget(0);
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

    // Store prev state for next render's diff
    prevNodesRef.current = nodes;
    prevEdgesRef.current = edges;

    return () => {
      sim.stop();
    };
  }, [nodes, edges, width, height, animate, highlightId, interactive, onNodeClick, getComparisonOutlineColor]);

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
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            padding: '8px 10px',
            fontSize: '13px',
            pointerEvents: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            zIndex: 10,
            maxWidth: '180px',
          }}
        />
      )}
    </div>
  );
}
