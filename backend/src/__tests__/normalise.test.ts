import {
  normaliseClasses,
  normaliseProject,
  unwrapProjectDetail,
  normalisePaginatedIssues,
} from '../utils/normalise';

// ---------------------------------------------------------------------------
// normaliseClasses
// ---------------------------------------------------------------------------

describe('normaliseClasses', () => {
  it('returns the number as-is when already a number', () => {
    expect(normaliseClasses(5)).toBe(5);
    expect(normaliseClasses(0)).toBe(0);
  });

  it('counts keys when given an object (Roboflow class map)', () => {
    const classMap = { pothole: 638, porthole: 75, bache: 113 };
    expect(normaliseClasses(classMap)).toBe(3);
  });

  it('returns 0 for null or undefined', () => {
    expect(normaliseClasses(null)).toBe(0);
    expect(normaliseClasses(undefined)).toBe(0);
  });

  it('returns 0 for an empty object', () => {
    expect(normaliseClasses({})).toBe(0);
  });

  it('returns 0 for an array (arrays are not class maps)', () => {
    // Arrays are objects but we explicitly exclude them
    expect(normaliseClasses(['a', 'b'])).toBe(0);
  });

  it('handles numeric-string keys that Roboflow sometimes includes', () => {
    const classMap = { '0': 100, pothole: 638, '-1': 42 };
    expect(normaliseClasses(classMap)).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// normaliseProject
// ---------------------------------------------------------------------------

describe('normaliseProject', () => {
  it('converts classes object to a count', () => {
    const raw = { id: 'ws/proj', name: 'Test', classes: { cat: 10, dog: 20 } };
    const result = normaliseProject(raw);
    expect(result.classes).toBe(2);
  });

  it('leaves classes alone when already a number', () => {
    const raw = { id: 'ws/proj', name: 'Test', classes: 7 };
    const result = normaliseProject(raw);
    expect(result.classes).toBe(7);
  });

  it('preserves all other fields unchanged', () => {
    const raw = { id: 'ws/proj', name: 'Test', images: 500, versions: 2, classes: { a: 1 } };
    const result = normaliseProject(raw);
    expect(result.id).toBe('ws/proj');
    expect(result.images).toBe(500);
    expect(result.versions).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// unwrapProjectDetail
// ---------------------------------------------------------------------------

describe('unwrapProjectDetail', () => {
  it('unwraps a project nested under its identifier key', () => {
    const data = {
      'my-project': {
        id: 'ws/my-project',
        name: 'My Project',
        classes: { pothole: 100, road: 200 },
      },
    };
    const result = unwrapProjectDetail(data);
    expect(result.id).toBe('ws/my-project');
    expect(result.name).toBe('My Project');
    expect(result.classes).toBe(2);
  });

  it('ignores the workspace key when finding the project key', () => {
    const data = {
      workspace: { name: 'my-workspace' },
      'pothole-detection': { id: 'ws/pothole-detection', name: 'Pothole', classes: {} },
    };
    const result = unwrapProjectDetail(data);
    expect(result.id).toBe('ws/pothole-detection');
  });

  it('falls back gracefully if no nested key exists', () => {
    const data = { id: 'ws/flat', name: 'Flat', classes: 4 };
    const result = unwrapProjectDetail(data);
    expect(result.id).toBe('ws/flat');
    expect(result.classes).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// normalisePaginatedIssues
// ---------------------------------------------------------------------------

describe('normalisePaginatedIssues', () => {
  it('maps issues array to data field', () => {
    const raw = { issues: [{ id: 1 }, { id: 2 }], total_count: 2, offset: 0, limit: 25 };
    const result = normalisePaginatedIssues(raw);
    expect(result.data).toHaveLength(2);
    expect(result.total_count).toBe(2);
    expect(result.offset).toBe(0);
    expect(result.limit).toBe(25);
  });

  it('returns empty data array when issues is missing', () => {
    const result = normalisePaginatedIssues({});
    expect(result.data).toEqual([]);
    expect(result.total_count).toBe(0);
    expect(result.limit).toBe(25);
  });

  it('uses provided offset and limit values', () => {
    const raw = { issues: [], total_count: 50, offset: 25, limit: 25 };
    const result = normalisePaginatedIssues(raw);
    expect(result.offset).toBe(25);
    expect(result.total_count).toBe(50);
  });
});
