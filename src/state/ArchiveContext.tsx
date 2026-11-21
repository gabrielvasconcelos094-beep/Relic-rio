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
  Collection,
  HistoryEntry,
  ID,
  Memory,
  Person,
  Reminder,
  Settings,
  Source,
} from '@/db/types';
import { DEFAULT_SETTINGS } from '@/db/types';
import type { ArchiveSnapshot } from '@/utils/backup';

interface ArchiveState {
  ready: boolean;
  error: string | null;
  /** Todas as memórias, inclusive as que estão na lixeira. */
  allMemories: Memory[];
  people: Person[];
  categories: Category[];
  collections: Collection[];
  sources: Source[];
  attachments: Attachment[];
  capsules: Capsule[];
  history: HistoryEntry[];
  reminders: Reminder[];
  settings: Settings;
}

interface ArchiveApi extends ArchiveState {
  /** Memórias ativas e já organizadas (fora da lixeira e fora da Entrada). */
  memories: Memory[];
  /** Memórias ativas incluindo as da Entrada. */
  activeMemories: Memory[];
  inbox: Memory[];
  trash: Memory[];

  reload: () => Promise<void>;
  snapshot: () => ArchiveSnapshot;

  saveMemory: (m: Memory, options?: { silent?: boolean }) => Promise<Memory>;
  createMemory: (m: Memory) => Promise<Memory>;
  trashMemory: (id: ID) => Promise<void>;
  restoreMemory: (id: ID) => Promise<void>;
  destroyMemory: (id: ID) => Promise<void>;
  emptyTrash: () => Promise<number>;
  toggleFavorite: (id: ID) => Promise<void>;
  toggleHardDay: (id: ID) => Promise<void>;
  fileFromInbox: (id: ID) => Promise<void>;

  savePerson: (p: Person) => Promise<Person>;
  deletePerson: (id: ID) => Promise<void>;
  saveCategory: (c: Category) => Promise<void>;
  deleteCategory: (id: ID) => Promise<void>;
  saveCollection: (c: Collection) => Promise<Collection>;
  deleteCollection: (id: ID) => Promise<void>;
  setCollectionMembership: (collectionId: ID, memoryIds: ID[]) => Promise<void>;
  saveSource: (s: Source) => Promise<void>;
  deleteSource: (id: ID) => Promise<void>;

  addAttachment: (
    file: File,
    ownerKind: Attachment['ownerKind'],
    ownerId: ID,
    options?: { caption?: string; sourceId?: ID | null; personId?: ID | null },
  ) => Promise<Attachment>;
  updateAttachment: (a: Attachment) => Promise<void>;
  deleteAttachment: (id: ID) => Promise<void>;

  saveCapsule: (c: Capsule) => Promise<Capsule>;
  deleteCapsule: (id: ID) => Promise<void>;
  saveReminder: (r: Reminder) => Promise<Reminder>;
  deleteReminder: (id: ID) => Promise<void>;

  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  renameTag: (from: string, to: string) => Promise<void>;
  deleteTag: (tag: string) => Promise<void>;
  wipeArchive: () => Promise<void>;
  removeDemoData: () => Promise<number>;

  historyOf: (memoryId: ID) => HistoryEntry[];
  restoreFromHistory: (entry: HistoryEntry) => Promise<void>;

  attachmentsOf: (ownerId: ID) => Attachment[];
  memoryById: (id: ID) => Memory | undefined;
  personById: (id: ID) => Person | undefined;
  categoryById: (id: ID) => Category | undefined;
  collectionById: (id: ID) => Collection | undefined;
  sourceById: (id: ID) => Source | undefined;
  allTags: string[];
}

const ArchiveContext = createContext<ArchiveApi | null>(null);

const emptyState: ArchiveState = {
  ready: false,
  error: null,
  allMemories: [],
  people: [],
  categories: [],
  collections: [],
  sources: [],
  attachments: [],
  capsules: [],
  history: [],
  reminders: [],
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
      const settings = await archive.loadSettings();
      // Limpeza da lixeira vencida acontece na abertura, antes de qualquer leitura.
      await archive.purgeExpiredTrash(settings.trashRetentionDays);

      const [
        allMemories,
        people,
        categories,
        collections,
        sources,
        attachments,
        capsules,
        history,
        reminders,
      ] = await Promise.all([
        archive.loadMemories(),
        archive.loadPeople(),
        archive.loadCategories(),
        archive.loadCollections(),
        archive.loadSources(),
        archive.loadAttachments(),
        archive.loadCapsules(),
        archive.loadHistory(),
        archive.loadReminders(),
      ]);
      if (!mounted.current) return;
      setState({
        ready: true,
        error: null,
        allMemories,
        people,
        categories,
        collections,
        sources,
        attachments,
        capsules,
        history,
        reminders,
        settings,
      });
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

    const activeMemories = state.allMemories.filter((m) => !m.deletedAt);
    const memories = activeMemories.filter((m) => !m.inbox);
    const inbox = activeMemories
      .filter((m) => m.inbox)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const trash = state.allMemories
      .filter((m) => m.deletedAt)
      .sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? ''));

    const nameOf = {
      person: (id: ID) => state.people.find((p) => p.id === id)?.name ?? 'pessoa removida',
      category: (id: ID) => state.categories.find((c) => c.id === id)?.name ?? 'categoria removida',
      collection: (id: ID) =>
        state.collections.find((c) => c.id === id)?.name ?? 'coleção removida',
      source: (id: ID) => state.sources.find((s) => s.id === id)?.name ?? 'origem removida',
    };

    const putMemory = (saved: Memory) =>
      patch((s) => ({
        ...s,
        allMemories: s.allMemories.some((x) => x.id === saved.id)
          ? s.allMemories.map((x) => (x.id === saved.id ? saved : x))
          : [...s.allMemories, saved],
      }));

    const api: ArchiveApi = {
      ...state,
      memories,
      activeMemories,
      inbox,
      trash,
      reload,

      snapshot: () => ({
        memories: state.allMemories,
        people: state.people,
        categories: state.categories,
        collections: state.collections,
        sources: state.sources,
        attachments: state.attachments,
        capsules: state.capsules,
        history: state.history,
        reminders: state.reminders,
        settings: state.settings,
      }),

      async createMemory(m) {
        const saved = await archive.saveMemory(m);
        await archive.addHistory(saved.id, 'created', 'Memória guardada no relicário');
        putMemory(saved);
        const entries = await archive.historyOf(saved.id);
        patch((s) => ({
          ...s,
          history: [...s.history.filter((h) => h.memoryId !== saved.id), ...entries],
        }));
        return saved;
      },

      async saveMemory(m, options) {
        const before = state.allMemories.find((x) => x.id === m.id);
        const saved = await archive.saveMemory(m);
        if (before && !options?.silent) {
          await archive.recordChanges(before, saved, nameOf);
        }
        putMemory(saved);
        if (before && !options?.silent) {
          const entries = await archive.historyOf(saved.id);
          patch((s) => ({
            ...s,
            history: [...s.history.filter((h) => h.memoryId !== saved.id), ...entries],
          }));
        }
        return saved;
      },

      async trashMemory(id) {
        await archive.trashMemory(id);
        await reload();
      },

      async restoreMemory(id) {
        await archive.restoreMemory(id);
        await reload();
      },

      async destroyMemory(id) {
        await archive.destroyMemory(id);
        patch((s) => ({
          ...s,
          allMemories: s.allMemories.filter((m) => m.id !== id),
          attachments: s.attachments.filter((a) => a.ownerId !== id),
          history: s.history.filter((h) => h.memoryId !== id),
          capsules: s.capsules.map((c) =>
            c.memoryIds.includes(id) ? { ...c, memoryIds: c.memoryIds.filter((x) => x !== id) } : c,
          ),
        }));
      },

      async emptyTrash() {
        const n = await archive.emptyTrash();
        await reload();
        return n;
      },

      async toggleFavorite(id) {
        const m = state.allMemories.find((x) => x.id === id);
        if (m) await api.saveMemory({ ...m, favorite: !m.favorite });
      },

      async toggleHardDay(id) {
        const m = state.allMemories.find((x) => x.id === id);
        if (m) await api.saveMemory({ ...m, hardDay: !m.hardDay });
      },

      async fileFromInbox(id) {
        const m = state.allMemories.find((x) => x.id === id);
        if (m) await api.saveMemory({ ...m, inbox: false });
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
        await reload();
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
        await reload();
      },

      async saveCollection(c) {
        const saved = await archive.saveCollection(c);
        patch((s) => ({
          ...s,
          collections: (s.collections.some((x) => x.id === saved.id)
            ? s.collections.map((x) => (x.id === saved.id ? saved : x))
            : [...s.collections, saved]
          ).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
        }));
        return saved;
      },

      async deleteCollection(id) {
        await archive.deleteCollection(id);
        await reload();
      },

      /** Ajusta de uma vez quais memórias pertencem a uma coleção. */
      async setCollectionMembership(collectionId, memoryIds) {
        const wanted = new Set(memoryIds);
        const touched: Memory[] = [];
        for (const m of state.allMemories) {
          const has = m.collectionIds.includes(collectionId);
          if (wanted.has(m.id) && !has) {
            touched.push({ ...m, collectionIds: [...m.collectionIds, collectionId] });
          } else if (!wanted.has(m.id) && has) {
            touched.push({
              ...m,
              collectionIds: m.collectionIds.filter((c) => c !== collectionId),
            });
          }
        }
        for (const m of touched) await api.saveMemory(m);
      },

      async saveSource(s) {
        await archive.saveSource(s);
        patch((st) => ({
          ...st,
          sources: (st.sources.some((x) => x.id === s.id)
            ? st.sources.map((x) => (x.id === s.id ? s : x))
            : [...st.sources, s]
          ).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'pt-BR')),
        }));
      },

      async deleteSource(id) {
        await archive.deleteSource(id);
        await reload();
      },

      async addAttachment(file, ownerKind, ownerId, options) {
        const att = await archive.addAttachment(file, ownerKind, ownerId, options);
        patch((s) => ({ ...s, attachments: [...s.attachments, att] }));
        if (ownerKind === 'memory') {
          await archive.addHistory(ownerId, 'attachment-added', `Anexo adicionado: ${att.name}`);
        }
        return att;
      },

      async updateAttachment(a) {
        await archive.updateAttachment(a);
        patch((s) => ({ ...s, attachments: s.attachments.map((x) => (x.id === a.id ? a : x)) }));
      },

      async deleteAttachment(id) {
        const att = state.attachments.find((a) => a.id === id);
        await archive.deleteAttachment(id);
        if (att?.ownerKind === 'memory') {
          await archive.addHistory(
            att.ownerId,
            'attachment-removed',
            `Anexo removido: ${att.name}`,
          );
        }
        patch((s) => ({
          ...s,
          attachments: s.attachments.filter((a) => a.id !== id),
          people: s.people.map((p) => (p.photoId === id ? { ...p, photoId: null } : p)),
          collections: s.collections.map((c) => (c.coverId === id ? { ...c, coverId: null } : c)),
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

      async saveReminder(r) {
        const saved = await archive.saveReminder(r);
        patch((s) => ({
          ...s,
          reminders: s.reminders.some((x) => x.id === saved.id)
            ? s.reminders.map((x) => (x.id === saved.id ? saved : x))
            : [...s.reminders, saved],
        }));
        return saved;
      },

      async deleteReminder(id) {
        await archive.deleteReminder(id);
        patch((s) => ({ ...s, reminders: s.reminders.filter((r) => r.id !== id) }));
      },

      async updateSettings(p) {
        await archive.saveSettings(p);
        patch((s) => ({ ...s, settings: { ...s.settings, ...p } }));
      },

      async renameTag(from, to) {
        const target = to.trim();
        if (!target) return;
        for (const m of state.allMemories.filter((m) => m.tags.includes(from))) {
          await archive.saveMemory({
            ...m,
            tags: Array.from(new Set(m.tags.map((t) => (t === from ? target : t)))),
          });
        }
        for (const p of state.people.filter((p) => p.tags.includes(from))) {
          await archive.savePerson({
            ...p,
            tags: Array.from(new Set(p.tags.map((t) => (t === from ? target : t)))),
          });
        }
        await reload();
      },

      async deleteTag(tag) {
        for (const m of state.allMemories.filter((m) => m.tags.includes(tag))) {
          await archive.saveMemory({ ...m, tags: m.tags.filter((t) => t !== tag) });
        }
        for (const p of state.people.filter((p) => p.tags.includes(tag))) {
          await archive.savePerson({ ...p, tags: p.tags.filter((t) => t !== tag) });
        }
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

      historyOf: (memoryId) =>
        state.history
          .filter((h) => h.memoryId === memoryId)
          .sort((a, b) => b.at.localeCompare(a.at)),

      async restoreFromHistory(entry) {
        const memory = state.allMemories.find((m) => m.id === entry.memoryId);
        if (!memory) return;
        await archive.restoreFromHistory(entry, memory);
        await reload();
      },

      attachmentsOf: (ownerId) => state.attachments.filter((a) => a.ownerId === ownerId),
      memoryById: (id) => state.allMemories.find((m) => m.id === id),
      personById: (id) => state.people.find((p) => p.id === id),
      categoryById: (id) => state.categories.find((c) => c.id === id),
      collectionById: (id) => state.collections.find((c) => c.id === id),
      sourceById: (id) => state.sources.find((s) => s.id === id),
      allTags: Array.from(
        new Set([
          ...state.allMemories.flatMap((m) => m.tags),
          ...state.people.flatMap((p) => p.tags),
        ]),
      ).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    };

    return api;
  }, [state, reload]);

  return <ArchiveContext.Provider value={api}>{children}</ArchiveContext.Provider>;
}

export function useArchive(): ArchiveApi {
  const ctx = useContext(ArchiveContext);
  if (!ctx) throw new Error('useArchive precisa estar dentro de <ArchiveProvider>.');
  return ctx;
}
