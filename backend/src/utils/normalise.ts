/**
 * Roboflow returns `classes` as a name→count map object when listing workspace projects.
 * Convert it to a plain integer (number of distinct classes) so the frontend can render it.
 */
export function normaliseClasses(classes: unknown): number {
  if (typeof classes === 'number') return classes;
  if (classes && typeof classes === 'object' && !Array.isArray(classes)) {
    return Object.keys(classes).length;
  }
  return 0;
}

/**
 * Normalise a raw Roboflow project record from the workspace list endpoint.
 * The upstream response may have `classes` as an object — convert to count.
 */
export function normaliseProject(raw: Record<string, unknown>): Record<string, unknown> {
  return { ...raw, classes: normaliseClasses(raw.classes) };
}

/**
 * Roboflow's single-project detail endpoint wraps the project under its own
 * identifier as the top-level key, e.g. { "my-project": { ... } }.
 * Unwrap it and normalise the classes field.
 */
export function unwrapProjectDetail(data: Record<string, unknown>): Record<string, unknown> {
  const projectKey = Object.keys(data).find(
    (k) => k !== 'workspace' && typeof data[k] === 'object' && data[k] !== null && !Array.isArray(data[k])
  );
  const project: Record<string, unknown> = projectKey
    ? (data[projectKey] as Record<string, unknown>)
    : data;
  return normaliseProject(project);
}

/**
 * Build a standard paginated response shape from a Redmine issues response.
 * Redmine returns { issues: [...], total_count: N } — map to { data: [...], total_count: N }.
 */
export function normalisePaginatedIssues(raw: {
  issues?: unknown[];
  total_count?: number;
  offset?: number;
  limit?: number;
}): { data: unknown[]; total_count: number; offset: number; limit: number } {
  return {
    data: raw.issues ?? [],
    total_count: raw.total_count ?? 0,
    offset: raw.offset ?? 0,
    limit: raw.limit ?? 25,
  };
}
