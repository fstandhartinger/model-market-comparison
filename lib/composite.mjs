/**
 * Compute a missing-data-neutral composite capability score.
 *
 * Every benchmark is first normalized to 0..100. DesignArena's two boards form
 * one slot and only clear the reliability gate when they have enough battles.
 * Models are compared pairwise using ONLY slots present for both models. Those
 * observed differences are fitted into one least-squares rating graph; pairs
 * with no common evidence create no edge. This propagates equivalent evidence
 * without rewarding the model whose row happens to be sparser. Coverage-subset
 * profiles that are identical on every observed slot are hard-equaled before
 * fitting. This deliberately gives up some individual pairwise margins: no
 * single scalar can preserve a non-transitive set such as A=B, A=C, but B>C.
 * The hard equality is the conservative fairness invariant; remaining margins
 * are fitted in least squares. A final robust shared-dominance constraint
 * prevents clear multi-slot wins from being reversed.
 * Missing results are never guessed: they contribute zero pairwise difference,
 * while the denominator remains the same fixed four-slot budget for every edge.
 */

export const DEFAULT_MIN_DA_BATTLES = 500;

const ATOMIC_KEYS = [
  "aa_coding_index",
  "aa_coding_agent",
  "aa_intelligence_index",
  "designarena_frontend",
  "designarena_fullstack",
];

const SLOT_KEYS = ["aa_coding_index", "aa_coding_agent", "aa_intelligence_index", "da"];
const MIN_ORDERING_EVIDENCE = 2;
const ORDERING_STEP = 0.1;

const finiteOrNull = (value) => typeof value === "number" && Number.isFinite(value) ? value : null;

export function computeCompositeScores(rows, { minDesignArenaBattles = DEFAULT_MIN_DA_BATTLES } = {}) {
  if (!rows.length) return new Map();

  const effective = rows.map((row) => {
    const scores = row.scores || {};
    const battles = row.designarenaBattles || {};
    return {
      id: row.id,
      values: {
        aa_coding_index: finiteOrNull(scores.aa_coding_index),
        aa_coding_agent: finiteOrNull(scores.aa_coding_agent),
        aa_intelligence_index: finiteOrNull(scores.aa_intelligence_index),
        designarena_frontend: (finiteOrNull(battles.frontend) ?? 0) >= minDesignArenaBattles
          ? finiteOrNull(scores.designarena_frontend) : null,
        designarena_fullstack: (finiteOrNull(battles.fullstack) ?? 0) >= minDesignArenaBattles
          ? finiteOrNull(scores.designarena_fullstack) : null,
      },
    };
  });

  const ranges = {};
  for (const key of ATOMIC_KEYS) {
    const values = effective.map((row) => row.values[key]).filter((value) => value != null);
    ranges[key] = values.length ? { min: Math.min(...values), max: Math.max(...values) } : null;
  }

  const normalize = (key, value) => {
    const range = ranges[key];
    if (value == null || !range) return null;
    if (range.max === range.min) return 50;
    return ((value - range.min) / (range.max - range.min)) * 100;
  };

  const slotRows = effective.map((row) => {
    const frontend = normalize("designarena_frontend", row.values.designarena_frontend);
    const fullstack = normalize("designarena_fullstack", row.values.designarena_fullstack);
    const daBoards = [frontend, fullstack].filter((value) => value != null);
    return {
      id: row.id,
      slots: {
        aa_coding_index: normalize("aa_coding_index", row.values.aa_coding_index),
        aa_coding_agent: normalize("aa_coding_agent", row.values.aa_coding_agent),
        aa_intelligence_index: normalize("aa_intelligence_index", row.values.aa_intelligence_index),
        da: daBoards.length ? daBoards.reduce((sum, value) => sum + value, 0) / daBoards.length : null,
      },
    };
  });

  const scored = slotRows.filter((row) => SLOT_KEYS.some((key) => row.slots[key] != null));
  const result = new Map(slotRows.map((row) => [row.id, null]));
  if (scored.length === 1) {
    result.set(scored[0].id, 50);
    return result;
  }

  const sharedEvidence = (a, b) => SLOT_KEYS.filter((key) => a.slots[key] != null && b.slots[key] != null);

  // Missingness creates an important equality constraint before it creates any
  // comparison edges. If one row observes a strict subset of another row's
  // slots and every observed value is identical, the extra unpublished slots
  // cannot legitimately separate the two rows. Fitting the raw pair graph
  // without this constraint can do exactly that: the denser row receives an
  // extra edge while its otherwise identical sparse peer avoids it.
  //
  // Collapse these observationally equivalent profiles into quotient nodes.
  // This is an exact constraint (not a large arbitrary edge weight), so the
  // least-squares solve remains well-conditioned and equality cannot drift with
  // catalog size or iteration tolerance. If several denser profiles conflict
  // only in slots the sparse row does not publish, the conservative result is a
  // tie: the available evidence cannot distinguish them through that row.
  const parent = scored.map((_, index) => index);
  const findRoot = (index) => {
    while (parent[index] !== index) {
      parent[index] = parent[parent[index]];
      index = parent[index];
    }
    return index;
  };
  const union = (a, b) => {
    const rootA = findRoot(a), rootB = findRoot(b);
    if (rootA !== rootB) parent[rootB] = rootA;
  };
  const presentEvidence = (row) => SLOT_KEYS.filter((key) => row.slots[key] != null);
  const sameObservedProfile = (sparse, dense) => {
    const observed = presentEvidence(sparse);
    const denser = presentEvidence(dense);
    if (!observed.length || observed.length >= denser.length) return false;
    if (observed.some((key) => dense.slots[key] == null)) return false;
    return observed.every((key) => Math.abs(sparse.slots[key] - dense.slots[key]) <= 1e-9);
  };
  for (let i = 0; i < scored.length; i += 1) {
    for (let j = i + 1; j < scored.length; j += 1) {
      if (sameObservedProfile(scored[i], scored[j]) || sameObservedProfile(scored[j], scored[i])) union(i, j);
    }
  }
  const classIndexByRoot = new Map();
  const classOf = new Map();
  const classes = [];
  scored.forEach((row, index) => {
    const root = findRoot(index);
    if (!classIndexByRoot.has(root)) {
      classIndexByRoot.set(root, classes.length);
      classes.push([]);
    }
    const classIndex = classIndexByRoot.get(root);
    classes[classIndex].push(row);
    classOf.set(row.id, classIndex);
  });

  // Each edge says rating(a) - rating(b) should match their average normalized
  // difference on the evidence they share. Weighting by the number of shared
  // slots gives a multi-benchmark comparison proportionally more evidence, but
  // never invents an edge for a missing-only pair.
  const adjacency = new Map(classes.map((_, index) => [index, []]));
  for (let i = 0; i < scored.length; i += 1) {
    for (let j = i + 1; j < scored.length; j += 1) {
      const a = scored[i], b = scored[j];
      const classA = classOf.get(a.id), classB = classOf.get(b.id);
      if (classA === classB) continue;
      const shared = sharedEvidence(a, b);
      if (!shared.length) continue;
      // Always divide by the fixed four-slot budget. A slot missing on either
      // side contributes exactly zero difference; it must not amplify the
      // remaining evidence by shrinking this pair's denominator.
      const difference = shared.reduce((sum, key) => sum + a.slots[key] - b.slots[key], 0) / SLOT_KEYS.length;
      const weight = shared.length;
      adjacency.get(classA).push({ id: classB, difference, weight });
      adjacency.get(classB).push({ id: classA, difference: -difference, weight });
    }
  }

  // Solve the graph Laplacian independently per connected component. Anchoring
  // one node removes the additive null-space; recentering afterward makes the
  // arbitrary anchor irrelevant. Conjugate gradient is deterministic and keeps
  // the dense production graph inexpensive enough for request-time calculation.
  const rawRating = new Map();
  const ratingComponents = [];
  const unseen = new Set(classes.map((_, index) => index));
  while (unseen.size) {
    const first = unseen.values().next().value;
    const component = [];
    const pending = [first];
    unseen.delete(first);
    while (pending.length) {
      const id = pending.pop();
      component.push(id);
      for (const edge of adjacency.get(id)) {
        if (unseen.delete(edge.id)) pending.push(edge.id);
      }
    }
    ratingComponents.push(component);
    if (component.length === 1) {
      rawRating.set(component[0], 0);
      continue;
    }

    const variables = component.slice(1); // component[0] is fixed at zero
    const position = new Map(variables.map((id, index) => [id, index]));
    const degree = variables.map((id) => adjacency.get(id).reduce((sum, edge) => sum + edge.weight, 0));
    const rhs = variables.map((id) => adjacency.get(id).reduce((sum, edge) => sum + edge.weight * edge.difference, 0));
    const multiply = (vector) => variables.map((id, index) => {
      let value = degree[index] * vector[index];
      for (const edge of adjacency.get(id)) {
        const neighbor = position.get(edge.id);
        if (neighbor != null) value -= edge.weight * vector[neighbor];
      }
      return value;
    });
    const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
    const solution = new Array(variables.length).fill(0);
    let residual = [...rhs];
    let direction = [...residual];
    let residualSquared = dot(residual, residual);
    const tolerance = Math.max(1e-16, residualSquared * 1e-14);
    const maxIterations = Math.min(600, Math.max(80, variables.length * 2));
    for (let iteration = 0; iteration < maxIterations && residualSquared > tolerance; iteration += 1) {
      const product = multiply(direction);
      const denominator = dot(direction, product);
      if (Math.abs(denominator) < 1e-20) break;
      const alpha = residualSquared / denominator;
      for (let k = 0; k < solution.length; k += 1) {
        solution[k] += alpha * direction[k];
        residual[k] -= alpha * product[k];
      }
      const nextSquared = dot(residual, residual);
      if (nextSquared <= tolerance) {
        residualSquared = nextSquared;
        break;
      }
      const beta = nextSquared / residualSquared;
      for (let k = 0; k < direction.length; k += 1) direction[k] = residual[k] + beta * direction[k];
      residualSquared = nextSquared;
    }

    const anchored = new Map([[component[0], 0], ...variables.map((id, index) => [id, solution[index]])]);
    const mean = component.reduce((sum, id) => sum + anchored.get(id), 0) / component.length;
    for (const id of component) rawRating.set(id, anchored.get(id) - mean);
  }

  // Components with no evidence bridge are inherently incomparable. Scale each
  // independently so adding an unrelated benchmark island cannot move the scores
  // of an existing component.
  const classScore = new Map();
  for (const component of ratingComponents) {
    const maxMagnitude = Math.max(0, ...component.map((id) => Math.abs(rawRating.get(id))));
    const ratingScale = maxMagnitude > 0 ? 50 / maxMagnitude : 1;
    for (const id of component) classScore.set(id, 50 + rawRating.get(id) * ratingScale);
  }

  // Shared-evidence dominance is a partial order for the current data. Collapse
  // any future cycle into a tie component so contradictory cross-benchmark
  // constraints can never make the calculation fail or depend on iteration order.
  const dominanceEdges = new Map(classes.map((_, index) => [index, new Set()]));
  for (const a of scored) {
    for (const b of scored) {
      if (a === b) continue;
      const classA = classOf.get(a.id), classB = classOf.get(b.id);
      if (classA === classB) continue;
      const shared = sharedEvidence(a, b);
      if (shared.length < MIN_ORDERING_EVIDENCE) continue;
      if (shared.some((key) => a.slots[key] < b.slots[key])) continue;
      if (!shared.some((key) => a.slots[key] > b.slots[key])) continue;
      dominanceEdges.get(classA).add(classB);
    }
  }

  let visitIndex = 0;
  const stack = [];
  const onStack = new Set();
  const index = new Map();
  const low = new Map();
  const components = [];
  const visit = (node) => {
    index.set(node, visitIndex);
    low.set(node, visitIndex);
    visitIndex += 1;
    stack.push(node);
    onStack.add(node);
    for (const next of dominanceEdges.get(node)) {
      if (!index.has(next)) {
        visit(next);
        low.set(node, Math.min(low.get(node), low.get(next)));
      } else if (onStack.has(next)) {
        low.set(node, Math.min(low.get(node), index.get(next)));
      }
    }
    if (low.get(node) === index.get(node)) {
      const component = [];
      let item;
      do {
        item = stack.pop();
        onStack.delete(item);
        component.push(item);
      } while (item !== node);
      components.push(component);
    }
  };
  for (let classIndex = 0; classIndex < classes.length; classIndex += 1) {
    if (!index.has(classIndex)) visit(classIndex);
  }

  const componentOf = new Map();
  components.forEach((members, component) => members.forEach((id) => componentOf.set(id, component)));
  const componentEdges = new Map(components.map((_, component) => [component, new Set()]));
  const componentScore = new Map(components.map((members, component) => {
    return [component, members.reduce((sum, id) => sum + classScore.get(id), 0) / members.length];
  }));
  for (const [from, targets] of dominanceEdges) {
    for (const to of targets) {
      const a = componentOf.get(from), b = componentOf.get(to);
      if (a !== b) componentEdges.get(a).add(b);
    }
  }

  const indegree = new Map(components.map((_, component) => [component, 0]));
  for (const targets of componentEdges.values()) {
    for (const target of targets) indegree.set(target, indegree.get(target) + 1);
  }
  const queue = [...indegree].filter(([, degree]) => degree === 0).map(([component]) => component);
  const topological = [];
  while (queue.length) {
    const component = queue.shift();
    topological.push(component);
    for (const child of componentEdges.get(component)) {
      indegree.set(child, indegree.get(child) - 1);
      if (indegree.get(child) === 0) queue.push(child);
    }
  }
  for (const component of topological.reverse()) {
    let value = componentScore.get(component);
    for (const dominated of componentEdges.get(component)) {
      value = Math.max(value, componentScore.get(dominated) + ORDERING_STEP);
    }
    componentScore.set(component, value);
  }

  const maxAdjusted = Math.max(...componentScore.values());
  const minAdjusted = Math.min(...componentScore.values());
  for (const row of scored) {
    let value = componentScore.get(componentOf.get(classOf.get(row.id)));
    // Extremely long dominance chains can exceed the nominal range. Affine
    // compression preserves every tie/order instead of clipping several leaders.
    if (maxAdjusted > 100 && maxAdjusted > minAdjusted) {
      value = ((value - minAdjusted) / (maxAdjusted - minAdjusted)) * 100;
    }
    result.set(row.id, Math.round(Math.max(0, Math.min(100, value)) * 10) / 10);
  }

  return result;
}
