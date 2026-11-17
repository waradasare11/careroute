import type { Appointment, Journey, NodeKind, Requirement } from "./types";

export type GraphNode =
  | { id: string; kind: "appointment"; item: Appointment }
  | { id: string; kind: "requirement"; item: Requirement };

export function nodeMap(journey: Pick<Journey, "appointments" | "requirements">): Map<string, GraphNode> {
  const map = new Map<string, GraphNode>();
  for (const a of journey.appointments) map.set(a.id, { id: a.id, kind: "appointment", item: a });
  for (const r of journey.requirements) map.set(r.id, { id: r.id, kind: "requirement", item: r });
  return map;
}

export function nodeKind(journey: Journey, id: string): NodeKind | null {
  return nodeMap(journey).get(id)?.kind ?? null;
}

export function nodeTitle(journey: Journey, id: string): string {
  return nodeMap(journey).get(id)?.item.title ?? "Unknown step";
}

type Adjacency = Map<string, string[]>;

function dependencyAdjacency(nodes: Map<string, GraphNode>, overrides?: Map<string, string[]>): Adjacency {
  const adj: Adjacency = new Map();
  for (const [id, n] of nodes) adj.set(id, overrides?.get(id) ?? n.item.dependsOn);
  if (overrides) for (const [id, deps] of overrides) if (!adj.has(id)) adj.set(id, deps);
  return adj;
}

/**
 * Returns one dependency cycle as an ordered list of ids (first id repeated at the end),
 * or null when the graph is acyclic.
 */
export function findCycle(
  journey: Pick<Journey, "appointments" | "requirements">,
  overrides?: Map<string, string[]>,
): string[] | null {
  const adj = dependencyAdjacency(nodeMap(journey), overrides);
  const WHITE = 0, GREY = 1, BLACK = 2;
  const color = new Map<string, number>();
  const stack: string[] = [];

  const visit = (id: string): string[] | null => {
    color.set(id, GREY);
    stack.push(id);
    for (const dep of adj.get(id) ?? []) {
      if (!adj.has(dep)) continue;
      const c = color.get(dep) ?? WHITE;
      if (c === GREY) {
        const start = stack.indexOf(dep);
        return [...stack.slice(start), dep];
      }
      if (c === WHITE) {
        const found = visit(dep);
        if (found) return found;
      }
    }
    stack.pop();
    color.set(id, BLACK);
    return null;
  };

  for (const id of adj.keys()) {
    if ((color.get(id) ?? WHITE) === WHITE) {
      const found = visit(id);
      if (found) return found;
    }
  }
  return null;
}

/** Would setting `nodeId`'s dependencies to `dependsOn` create a cycle? */
export function wouldCreateCycle(journey: Journey, nodeId: string, dependsOn: string[]): string[] | null {
  if (dependsOn.includes(nodeId)) return [nodeId, nodeId];
  return findCycle(journey, new Map([[nodeId, dependsOn]]));
}

/** Every node `id` depends on, directly or indirectly. */
export function transitiveDependencies(journey: Journey, id: string): Set<string> {
  const nodes = nodeMap(journey);
  const out = new Set<string>();
  const walk = (cur: string) => {
    for (const dep of nodes.get(cur)?.item.dependsOn ?? []) {
      if (out.has(dep) || !nodes.has(dep)) continue;
      out.add(dep);
      walk(dep);
    }
  };
  walk(id);
  out.delete(id);
  return out;
}

/** Every node that depends on `id`, directly or indirectly. */
export function transitiveDependents(journey: Journey, id: string): Set<string> {
  const nodes = nodeMap(journey);
  const reverse = new Map<string, string[]>();
  for (const [nid, n] of nodes) {
    for (const dep of n.item.dependsOn) {
      if (!reverse.has(dep)) reverse.set(dep, []);
      reverse.get(dep)!.push(nid);
    }
  }
  const out = new Set<string>();
  const walk = (cur: string) => {
    for (const child of reverse.get(cur) ?? []) {
      if (out.has(child)) continue;
      out.add(child);
      walk(child);
    }
  };
  walk(id);
  out.delete(id);
  return out;
}

/**
 * Layering for the dependency diagram: depth = longest path from a node with no
 * dependencies. Assumes an acyclic graph; nodes in a cycle are placed at depth 0.
 */
export function dependencyDepths(journey: Journey): Map<string, number> {
  const nodes = nodeMap(journey);
  const depth = new Map<string, number>();
  if (findCycle(journey)) {
    for (const id of nodes.keys()) depth.set(id, 0);
    return depth;
  }
  const compute = (id: string): number => {
    const known = depth.get(id);
    if (known !== undefined) return known;
    const deps = (nodes.get(id)?.item.dependsOn ?? []).filter((d) => nodes.has(d));
    const d = deps.length === 0 ? 0 : Math.max(...deps.map(compute)) + 1;
    depth.set(id, d);
    return d;
  };
  for (const id of nodes.keys()) compute(id);
  return depth;
}

