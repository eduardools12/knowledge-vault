/**
 * Turning the flat `areas` table into the tree the interface shows.
 *
 * Pure and separate from the queries so the shape logic can be tested without a
 * database — and because "which areas may be a parent of this one" is the kind
 * of rule that is easy to get subtly wrong and impossible to notice until the
 * tree loops.
 */

export type AreaNode<T extends { id: string; parentId: string | null; name: string }> = T & {
  children: AreaNode<T>[];
  /** 0 for a root, 1 for its children, and so on. */
  depth: number;
};

/**
 * Builds the forest.
 *
 * An area whose parent is missing from the input is treated as a root rather
 * than dropped. That should not happen — the composite foreign key keeps
 * parents in the same user's rows — but silently losing a user's area would be
 * a far worse failure than showing it at the top level.
 */
export function buildAreaTree<T extends { id: string; parentId: string | null; name: string }>(
  areas: T[],
): AreaNode<T>[] {
  const byId = new Map<string, AreaNode<T>>();

  for (const area of areas) {
    byId.set(area.id, { ...area, children: [], depth: 0 });
  }

  const roots: AreaNode<T>[] = [];

  for (const area of areas) {
    const node = byId.get(area.id)!;
    const parent = area.parentId ? byId.get(area.parentId) : undefined;

    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  function assignDepth(nodes: AreaNode<T>[], depth: number) {
    for (const node of nodes) {
      node.depth = depth;
      node.children.sort(byName);
      assignDepth(node.children, depth + 1);
    }
  }

  roots.sort(byName);
  assignDepth(roots, 0);

  return roots;
}

/** Depth-first, so a parent is always immediately followed by its children. */
export function flattenAreaTree<T extends { id: string; parentId: string | null; name: string }>(
  nodes: AreaNode<T>[],
): AreaNode<T>[] {
  return nodes.flatMap((node) => [node, ...flattenAreaTree(node.children)]);
}

/**
 * Every area that cannot be the parent of `areaId`: itself and all of its
 * descendants.
 *
 * The database refuses a cycle outright, so this exists to keep the picker from
 * offering a choice that would be rejected on save — an error message for
 * something the interface should not have allowed is a worse experience than
 * simply not listing it.
 */
export function excludedParentIds<T extends { id: string; parentId: string | null }>(
  areas: T[],
  areaId: string,
): Set<string> {
  const childrenOf = new Map<string, string[]>();

  for (const area of areas) {
    if (area.parentId) {
      const siblings = childrenOf.get(area.parentId) ?? [];
      siblings.push(area.id);
      childrenOf.set(area.parentId, siblings);
    }
  }

  const excluded = new Set<string>([areaId]);
  const queue = [areaId];

  // Iterative rather than recursive, and guarded by the visited set: stored
  // data could already contain a loop from before the guard existed, and this
  // must not be the thing that hangs the page.
  while (queue.length > 0) {
    const current = queue.pop()!;

    for (const child of childrenOf.get(current) ?? []) {
      if (!excluded.has(child)) {
        excluded.add(child);
        queue.push(child);
      }
    }
  }

  return excluded;
}

function byName<T extends { name: string }>(a: T, b: T): number {
  return a.name.localeCompare(b.name, "pt-BR");
}
