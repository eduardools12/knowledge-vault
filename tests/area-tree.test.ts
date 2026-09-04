import { describe, expect, it } from "vitest";

import { buildAreaTree, excludedParentIds, flattenAreaTree } from "@/features/areas/tree";

/**
 * The area hierarchy is the one place in the app where a subtly wrong rule
 * does not just look wrong — it can loop forever. `buildAreaTree` and
 * `flattenAreaTree` decide what the tree looks like; `excludedParentIds`
 * decides what the picker is allowed to offer, which is the last line of
 * defence before the database's own cycle guard.
 */

type TestArea = { id: string; name: string; parentId: string | null };

function area(id: string, name: string, parentId: string | null = null): TestArea {
  return { id, name, parentId };
}

describe("buildAreaTree", () => {
  it("returns nothing for an empty vault", () => {
    expect(buildAreaTree([])).toEqual([]);
  });

  it("treats every area with no parent as a root", () => {
    const tree = buildAreaTree([area("a", "Tecnologia"), area("b", "Esportes")]);

    expect(tree.map((node) => node.id)).toEqual(["b", "a"]); // sorted by name
    expect(tree.every((node) => node.depth === 0)).toBe(true);
    expect(tree.every((node) => node.children.length === 0)).toBe(true);
  });

  it("nests a child under its parent, at depth 1", () => {
    const tree = buildAreaTree([
      area("tech", "Tecnologia"),
      area("py", "Python", "tech"),
    ]);

    expect(tree).toHaveLength(1);
    expect(tree[0]?.id).toBe("tech");
    expect(tree[0]?.depth).toBe(0);
    expect(tree[0]?.children).toHaveLength(1);
    expect(tree[0]?.children[0]?.id).toBe("py");
    expect(tree[0]?.children[0]?.depth).toBe(1);
  });

  it("assigns depth correctly three levels deep", () => {
    const tree = buildAreaTree([
      area("a", "A"),
      area("b", "B", "a"),
      area("c", "C", "b"),
    ]);

    const a = tree[0]!;
    const b = a.children[0]!;
    const c = b.children[0]!;

    expect([a.depth, b.depth, c.depth]).toEqual([0, 1, 2]);
  });

  it("sorts siblings by name using Portuguese collation", () => {
    // Plain code-point order would put "Álgebra" after "Zoologia"; PT-BR
    // collation treats the accent as a variant of the base letter.
    const tree = buildAreaTree([area("z", "Zoologia"), area("al", "Álgebra"), area("b", "Biologia")]);

    expect(tree.map((node) => node.name)).toEqual(["Álgebra", "Biologia", "Zoologia"]);
  });

  it("sorts children independently of their parent's position", () => {
    const tree = buildAreaTree([
      area("tech", "Tecnologia"),
      area("py", "Python", "tech"),
      area("js", "JavaScript", "tech"),
    ]);

    expect(tree[0]?.children.map((c) => c.name)).toEqual(["JavaScript", "Python"]);
  });

  it("keeps an area with a missing parent as a root instead of dropping it", () => {
    // Should not happen — the composite foreign key keeps parents in the same
    // user's rows — but losing a user's area silently would be worse than
    // surfacing it at the top level.
    const tree = buildAreaTree([area("orphan", "Órfã", "does-not-exist")]);

    expect(tree).toHaveLength(1);
    expect(tree[0]?.id).toBe("orphan");
    expect(tree[0]?.depth).toBe(0);
  });

  it("supports multiple independent trees", () => {
    const tree = buildAreaTree([
      area("tech", "Tecnologia"),
      area("py", "Python", "tech"),
      area("sport", "Esportes"),
      area("futebol", "Futebol", "sport"),
    ]);

    expect(tree).toHaveLength(2);
    expect(tree.find((n) => n.id === "tech")?.children.map((c) => c.id)).toEqual(["py"]);
    expect(tree.find((n) => n.id === "sport")?.children.map((c) => c.id)).toEqual(["futebol"]);
  });
});

describe("flattenAreaTree", () => {
  it("returns an empty list for an empty tree", () => {
    expect(flattenAreaTree([])).toEqual([]);
  });

  it("lists a parent immediately before its children (pre-order)", () => {
    const tree = buildAreaTree([
      area("tech", "Tecnologia"),
      area("py", "Python", "tech"),
      area("pandas", "Pandas", "py"),
      area("sport", "Esportes"),
    ]);

    const flat = flattenAreaTree(tree);

    expect(flat.map((n) => n.id)).toEqual(["sport", "tech", "py", "pandas"]);
  });

  it("keeps each node's depth after flattening, so indentation still matches", () => {
    const tree = buildAreaTree([
      area("tech", "Tecnologia"),
      area("py", "Python", "tech"),
      area("pandas", "Pandas", "py"),
    ]);

    const flat = flattenAreaTree(tree);

    expect(flat.map((n) => n.depth)).toEqual([0, 1, 2]);
  });
});

describe("excludedParentIds", () => {
  it("excludes the area itself", () => {
    const excluded = excludedParentIds([area("a", "A")], "a");

    expect(excluded.has("a")).toBe(true);
  });

  it("excludes direct children", () => {
    const areas = [area("a", "A"), area("b", "B", "a")];

    expect(excludedParentIds(areas, "a").has("b")).toBe(true);
  });

  it("excludes grandchildren and deeper descendants", () => {
    const areas = [area("a", "A"), area("b", "B", "a"), area("c", "C", "b"), area("d", "D", "c")];

    const excluded = excludedParentIds(areas, "a");

    expect(excluded.has("b")).toBe(true);
    expect(excluded.has("c")).toBe(true);
    expect(excluded.has("d")).toBe(true);
  });

  it("does not exclude siblings or unrelated areas", () => {
    const areas = [
      area("a", "A"),
      area("b", "B", "a"),
      area("sibling", "Sibling", "a"),
      area("unrelated", "Unrelated"),
    ];

    const excluded = excludedParentIds(areas, "b");

    expect(excluded.has("sibling")).toBe(false);
    expect(excluded.has("unrelated")).toBe(false);
    expect(excluded.has("a")).toBe(false); // an area's own parent stays pickable
  });

  it("terminates instead of looping forever on data that already contains a cycle", () => {
    // The database trigger added in this stage refuses to create this, but the
    // guard here is defence in depth against data from before the trigger
    // existed — it must not be what hangs the edit page.
    const areas = [area("a", "A", "b"), area("b", "B", "a")];

    expect(() => excludedParentIds(areas, "a")).not.toThrow();
    expect(excludedParentIds(areas, "a").has("b")).toBe(true);
  });
});
