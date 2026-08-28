import { DomainError } from "../errors";

export { DomainError };

export type DependencyEdge = {
  taskId: string;
  dependsOnTaskId: string;
};

export type AddDependencyResult = DependencyEdge & { duplicate?: true };

export function assertCanAddDependency(
  existing: DependencyEdge[],
  next: DependencyEdge,
): AddDependencyResult {
  if (next.taskId === next.dependsOnTaskId) {
    throw new DomainError("DEPENDENCY_SELF", "Self-dependency is forbidden");
  }

  const duplicate = existing.some(
    (edge) => edge.taskId === next.taskId && edge.dependsOnTaskId === next.dependsOnTaskId,
  );
  if (duplicate) {
    return { ...next, duplicate: true };
  }

  if (createsCycle([...existing, next])) {
    throw new DomainError("DEPENDENCY_CYCLE", "Dependency cycle is forbidden");
  }

  return next;
}

function createsCycle(edges: DependencyEdge[]): boolean {
  const adj = new Map<string, string[]>();
  const nodes = new Set<string>();
  for (const edge of edges) {
    nodes.add(edge.taskId);
    nodes.add(edge.dependsOnTaskId);
    const list = adj.get(edge.taskId) ?? [];
    list.push(edge.dependsOnTaskId);
    adj.set(edge.taskId, list);
  }

  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  for (const node of nodes) color.set(node, WHITE);

  const dfs = (u: string): boolean => {
    color.set(u, GRAY);
    for (const v of adj.get(u) ?? []) {
      const c = color.get(v) ?? WHITE;
      if (c === GRAY) return true;
      if (c === WHITE && dfs(v)) return true;
    }
    color.set(u, BLACK);
    return false;
  };

  for (const node of nodes) {
    if (color.get(node) === WHITE && dfs(node)) return true;
  }
  return false;
}
