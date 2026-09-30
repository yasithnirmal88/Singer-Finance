/**
 * In-memory double for the Firestore surface DataProvider uses.
 *
 * Backed by a map of collection path -> { documentId -> data }, so tests seed
 * data, trigger listeners, assert call counts and simulate write failures
 * without a backend. Every write the app makes uses a document id equal to the
 * natural key (invoiceNo, epfNumber, modelNumber), so read-back is just a map
 * lookup.
 */

type DocData = object;
type Listener = (snapshot: Snapshot) => void;

interface Constraint {
  kind: 'orderBy' | 'limit' | 'startAt' | 'endAt';
  field?: string;
  direction?: 'asc' | 'desc';
  value?: unknown;
}

interface QueryRef {
  base: string;
  constraints: Constraint[];
}

/** The path a listener/getDocs call is about: a query base or a document. */
type ReadRef = string | QueryRef;

const data = new Map<string, Map<string, DocData>>();
const listeners = new Map<string, Set<Listener>>();

export const calls = {
  setDoc: 0,
  deleteDoc: 0,
  commit: 0,
  onSnapshot: 0,
  getDocs: 0,
};

/** When set, the next N commit()/setDoc calls reject with a Firestore error. */
let failNextWrites = 0;

const collectionPath = (ref: ReadRef): string => (typeof ref === 'string' ? ref : ref.base);

const createSnapshot = (path: string): Snapshot => ({
  docs: Array.from(data.get(path)?.entries() ?? []).map(([id, value]) => ({
    id,
    ref: `${path}/${id}`,
    data: () => value,
  })),
  forEach(callback: (doc: { id: string; ref: string; data: () => DocData }) => void) {
    for (const doc of this.docs) callback(doc);
  },
});

const readSnapshot = (ref: ReadRef): Snapshot => createSnapshot(collectionPath(ref));

const emit = (path: string) => {
  const snapshot = createSnapshot(path);
  for (const listener of listeners.get(path) ?? []) listener(snapshot);
};

export const collection = (db: unknown, ...segments: string[]): string => {
  if (typeof db !== 'string' && segments[0] !== 'users') {
    throw new Error(`Unexpected collection "users/${segments[0]}"`);
  }
  return segments.join('/');
};

export const doc = (dbOrRef: unknown, ...segments: string[]): string => {
  const all = typeof dbOrRef === 'string' ? [dbOrRef, ...segments] : segments;
  return all.join('/');
};

export const orderBy = (field: string, direction: 'asc' | 'desc' = 'asc'): Constraint => ({
  kind: 'orderBy',
  field,
  direction,
});

export const limit = (value: number): Constraint => ({ kind: 'limit', value });

export const startAt = (value: unknown): Constraint => ({ kind: 'startAt', value });

export const endAt = (value: unknown): Constraint => ({ kind: 'endAt', value });

export const query = (ref: string, ...constraints: Constraint[]): QueryRef => ({
  base: ref,
  constraints,
});

export const onSnapshot = (ref: ReadRef, next: (snapshot: Snapshot) => void): (() => void) => {
  calls.onSnapshot += 1;
  const path = collectionPath(ref);
  const set = listeners.get(path) ?? new Set<Listener>();
  set.add(next);
  listeners.set(path, set);
  next(readSnapshot(ref));
  return () => {
    set.delete(next);
  };
};

export const getDocs = async (ref: ReadRef): Promise<Snapshot> => {
  calls.getDocs += 1;
  return readSnapshot(ref);
};

export const setDoc = async (ref: string, value: DocData): Promise<void> => {
  if (failNextWrites > 0) {
    failNextWrites -= 1;
    throw new Error('Transaction failed');
  }
  calls.setDoc += 1;
  const slash = ref.lastIndexOf('/');
  const path = ref.slice(0, slash);
  const id = ref.slice(slash + 1);
  const bucket = data.get(path) ?? new Map<string, DocData>();
  bucket.set(id, value);
  data.set(path, bucket);
  emit(path);
};

export const deleteDoc = async (ref: string): Promise<void> => {
  if (failNextWrites > 0) {
    failNextWrites -= 1;
    throw new Error('Transaction failed');
  }
  calls.deleteDoc += 1;
  const slash = ref.lastIndexOf('/');
  const path = ref.slice(0, slash);
  const id = ref.slice(slash + 1);
  data.get(path)?.delete(id);
  emit(path);
};

export const writeBatch = () => {
  const staged: { ref: string; value: DocData }[] = [];
  const stagedDeletes: string[] = [];
  const touched = new Set<string>();

  const apply = (ref: string, value: DocData) => {
    const slash = ref.lastIndexOf('/');
    const path = ref.slice(0, slash);
    const id = ref.slice(slash + 1);
    const bucket = data.get(path) ?? new Map<string, DocData>();
    bucket.set(id, value);
    data.set(path, bucket);
    touched.add(path);
  };

  return {
    set(ref: string, value: DocData) {
      staged.push({ ref, value });
    },
    delete(ref: string) {
      stagedDeletes.push(ref);
    },
    async commit() {
      if (failNextWrites > 0) {
        failNextWrites -= 1;
        throw new Error('Transaction failed');
      }
      calls.commit += 1;
      for (const { ref, value } of staged) apply(ref, value);
      for (const ref of stagedDeletes) {
        const slash = ref.lastIndexOf('/');
        const path = ref.slice(0, slash);
        const id = ref.slice(slash + 1);
        data.get(path)?.delete(id);
        touched.add(path);
      }
      staged.length = 0;
      stagedDeletes.length = 0;
      for (const path of touched) emit(path);
      touched.clear();
    },
  };
};

/* ------------------------------------------------------------- test helpers */

export type Snapshot = {
  docs: { id: string; ref: string; data: () => DocData }[];
  forEach: (callback: (doc: { id: string; ref: string; data: () => DocData }) => void) => void;
};

/** Seed a collection with { documentId -> fields }. */
export const seed = (path: string, records: Record<string, DocData>): void => {
  const bucket = data.get(path) ?? new Map<string, DocData>();
  for (const [id, fields] of Object.entries(records)) bucket.set(id, fields);
  data.set(path, bucket);
};

/** The stored data as a plain object, for assertions. */
export const getStored = (): Record<string, Record<string, DocData>> =>
  Object.fromEntries(Array.from(data.entries()).map(([path, bucket]) => [path, Object.fromEntries(bucket)]));

/** Make the next N write mutations reject, leaving stored data untouched. */
export const failWrites = (count: number): void => {
  failNextWrites = count;
};

/** Clear all stored data, listeners, call counters and failure flags. */
export const reset = (): void => {
  data.clear();
  listeners.clear();
  calls.setDoc = 0;
  calls.deleteDoc = 0;
  calls.commit = 0;
  calls.onSnapshot = 0;
  calls.getDocs = 0;
  failNextWrites = 0;
};