import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import * as archive from '@/db/archive';
import type {
  Attachment,
  Capsule,
  Category,
  ID,
  Memory,
  Person,
  Settings,
} from '@/db/types';
import { DEFAULT_SETTINGS } from '@/db/types';

interface ArchiveState {
  ready: boolean;
  error: string | null;
  memories: Memory[];
  people: Person[];
  categories: Category[];
  attachments: Attachment[];
  capsules: Capsule[];
  settings: Settings;
}

interface ArchiveApi extends ArchiveState {
  reload: () => Promise<void>;
  saveMemory: (m: Memory) => Promise<Memory>;
  deleteMemory: (id: ID) => Promise<void>;
  toggleFavorite: (id: ID) => Promise<void>;
  toggleHardDay: (id: ID) => Promise<void>;
  savePerson: (p: Person) => Promise<Person>;
  deletePerson: (id: ID) => Promise<void>;
  saveCategory: (c: Category) => Promise<void>;
  deleteCategory: (id: ID) => Promise<void>;
  addAttachment: (
    file: File,
    ownerKind: Attachment['ownerKind'],
    ownerId: ID,
    caption?: string,
  ) => Promise<Attachment>;
  updateAttachment: (a: Attachment) => Promise<void>;
  deleteAttachment: (id: ID) => Promise<void>;
  saveCapsule: (c: Capsule) => Promise<Capsule>;
  deleteCapsule: (id: ID) => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  renameTag: (from: string, to: string) => Promise<void>;
  deleteTag: (tag: string) => Promise<void>;
  wipeArchive: () => Promise<void>;
  removeDemoData: () => Promise<number>;
  attachmentsOf: (ownerId: ID) => Attachment[];
  memoryById: (id: ID) => Memory | undefined;
  personById: (id: ID) => Person | undefined;
  categoryById: (id: ID) => Category | undefined;
  allTags: string[];
}

const ArchiveContext = createContext<ArchiveApi | null>(null);

const emptyState: ArchiveState = {
  ready: false,
  error: null,
  memories: [],
  people: [],
  categories: [],
  attachments: [],
  capsules: [],
  settings: DEFAULT_SETTINGS,
};

export function ArchiveProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ArchiveState>(emptyState);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const reload = useCallback(async () => {
    try {
      const [memories, people, categories, attachments, capsules, settings] = await Promise.all([
        archive.loadMemories(),
        archive.loadPeople(),
        archive.loadCategories(),
        archive.loadAttachments(),
        archive.loadCapsules(),
        archive.loadSettings(),
      ]);
      if (!mounted.current) return;
      setState({ ready: true, error: null, memories, people, categories, attachments, capsules, settings });
    } catch (err) {
      if (!mounted.current) return;
      setState((s) => ({
        ...s,
        ready: true,
        error: err instanceof Error ? err.message : 'Não foi possível abrir o arquivo local.',
      }));
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const api = useMemo<ArchiveApi>(() => {
    const patch = (fn: (s: ArchiveState) => ArchiveState) => setState((s) => fn(s));

    return {
      ...state,
      reload,

      async saveMemory(m) {
        const saved = await archive.saveMemory(m);
        patch((s) => ({
          ...s,
          memories: s.memories.some((x) => x.id === saved.id)
            ? s.memories.map((x) => (x.id === saved.id ? saved : x))
            : [...s.memories, saved],
        }));
        return saved;
      },

      async deleteMemory(id) {
        await archive.deleteMemory(id);
        patch((s) => ({
          ...s,
          memories: s.memories.filter((m) => m.id !== id),
          attachments: s.attachments.filter((a) => a.ownerId !== id),
          capsules: s.capsules.map((c) =>
            c.memoryIds.includes(id) ? { ...c, memoryIds: c.memoryIds.filter((x) => x !== id) } : c,
          ),
        }));
      },

      async toggleFavorite(id) {
        const m = state.memories.find((x) => x.id === id);
        if (!m) return;
        await this.saveMemory({ ...m, favorite: !m.favorite });
      },

      async toggleHardDay(id) {
        const m = state.memories.find((x) => x.id === id);
        if (!m) return;
        await this.saveMemory({ ...m, hardDay: !m.hardDay });
      },

      async savePerson(p) {
        const saved = await archive.savePerson(p);
        patch((s) => ({
          ...s,
          people: s.people.some((x) => x.id === saved.id)
            ? s.people.map((x) => (x.id === saved.id ? saved : x))
            : [...s.people, saved],
        }));
        return saved;
      },

      async deletePerson(id) {
        await archive.deletePerson(id);
        patch((s) => ({
          ...s,
          people: s.people.filter((p) => p.id !== id),
          memories: s.memories.map((m) =>
            m.personIds.includes(id) ? { ...m, personIds: m.personIds.filter((x) => x !== id) } : m,
          ),
          attachments: s.attachments.filter((a) => a.ownerId !== id),
        }));
      },

      async saveCategory(c) {
        await archive.saveCategory(c);
        patch((s) => ({
          ...s,
          categories: (s.categories.some((x) => x.id === c.id)
            ? s.categories.map((x) => (x.id === c.id ? c : x))
            : [...s.categories, c]
          ).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'pt-BR')),
        }));
      },

      async deleteCategory(id) {
        await archive.deleteCategory(id);
        patch((s) => ({
          ...s,
          categories: s.categories.filter((c) => c.id !== id),
          memories: s.memories.map((m) =>
            m.categoryIds.includes(id)
              ? { ...m, categoryIds: m.categoryIds.filter((x) => x !== id) }
              : m,
          ),
        }));
      },

      async addAttachment(file, ownerKind, ownerId, caption = '') {
        const att = await archive.addAttachment(file, ownerKind, ownerId, caption);
        patch((s) => ({ ...s, attachments: [...s.attachments, att] }));
        return att;
      },

      async updateAttachment(a) {
        await archive.updateAttachment(a);
        patch((s) => ({ ...s, attachments: s.attachments.map((x) => (x.id === a.id ? a : x)) }));
      },

      async deleteAttachment(id) {
        await archive.deleteAttachment(id);
        patch((s) => ({
          ...s,
          attachments: s.attachments.filter((a) => a.id !== id),
          people: s.people.map((p) => (p.photoId === id ? { ...p, photoId: null } : p)),
        }));
      },

      async saveCapsule(c) {
        const saved = await archive.saveCapsule(c);
        patch((s) => ({
          ...s,
          capsules: s.capsules.some((x) => x.id === saved.id)
            ? s.capsules.map((x) => (x.id === saved.id ? saved : x))
            : [...s.capsules, saved],
        }));
        return saved;
      },

      async deleteCapsule(id) {
        await archive.deleteCapsule(id);
        patch((s) => ({
          ...s,
          capsules: s.capsules.filter((c) => c.id !== id),
          attachments: s.attachments.filter((a) => a.ownerId !== id),
        }));
      },

      async updateSettings(p) {
        await archive.saveSettings(p);
        patch((s) => ({ ...s, settings: { ...s.settings, ...p } }));
      },

      async renameTag(from, to) {
        const target = to.trim();
        if (!target) return;
        const touched = state.memories
          .filter((m) => m.tags.includes(from))
          .map((m) => ({
            ...m,
            tags: Array.from(new Set(m.tags.map((t) => (t === from ? target : t)))),
          }));
        for (const m of touched) await archive.saveMemory(m);
        const people = state.people
          .filter((p) => p.tags.includes(from))
          .map((p) => ({ ...p, tags: Array.from(new Set(p.tags.map((t) => (t === from ? target : t)))) }));
        for (const p of people) await archive.savePerson(p);
        await reload();
      },

      async deleteTag(tag) {
        const touched = state.memories
          .filter((m) => m.tags.includes(tag))
          .map((m) => ({ ...m, tags: m.tags.filter((t) => t !== tag) }));
        for (const m of touched) await archive.saveMemory(m);
        const people = state.people
          .filter((p) => p.tags.includes(tag))
          .map((p) => ({ ...p, tags: p.tags.filter((t) => t !== tag) }));
        for (const p of people) await archive.savePerson(p);
        await reload();
      },

      async wipeArchive() {
        await archive.wipeArchive();
        await reload();
      },

      async removeDemoData() {
        const n = await archive.removeDemoData();
        await reload();
        return n;
      },

      attachmentsOf(ownerId) {
        return state.attachments.filter((a) => a.ownerId === ownerId);
      },
      memoryById: (id) => state.memories.find((m) => m.id === id),
      personById: (id) => state.people.find((p) => p.id === id),
      categoryById: (id) => state.categories.find((c) => c.id === id),
      allTags: Array.from(
        new Set([...state.memories.flatMap((m) => m.tags), ...state.people.flatMap((p) => p.tags)]),
      ).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    };
  }, [state, reload]);

  return <ArchiveContext.Provider value={api}>{children}</ArchiveContext.Provider>;
}

export function useArchive(): ArchiveApi {
  const ctx = useContext(ArchiveContext);
  if (!ctx) throw new Error('useArchive precisa estar dentro de <ArchiveProvider>.');
  return ctx;
}
