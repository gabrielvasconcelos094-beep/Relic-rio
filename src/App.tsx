import { useEffect } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useArchive } from '@/state/ArchiveContext';
import { useLock } from '@/state/LockContext';
import { Icon } from '@/components/Icon';
import { LockScreen } from '@/screens/LockScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { MemoriesScreen } from '@/screens/MemoriesScreen';
import { MemoryDetailScreen } from '@/screens/MemoryDetailScreen';
import { MemoryEditorScreen } from '@/screens/MemoryEditorScreen';
import { InboxScreen } from '@/screens/InboxScreen';
import { PeopleScreen } from '@/screens/PeopleScreen';
import { PersonDetailScreen } from '@/screens/PersonDetailScreen';
import { PersonEditorScreen } from '@/screens/PersonEditorScreen';
import { MoreScreen } from '@/screens/MoreScreen';
import { CollectionsScreen } from '@/screens/CollectionsScreen';
import { CollectionDetailScreen } from '@/screens/CollectionDetailScreen';
import { CollectionEditorScreen } from '@/screens/CollectionEditorScreen';
import { HardDaysScreen } from '@/screens/HardDaysScreen';
import { StatsScreen } from '@/screens/StatsScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { AppearanceScreen } from '@/screens/AppearanceScreen';
import { DisplayScreen } from '@/screens/DisplayScreen';
import { CategoriesScreen } from '@/screens/CategoriesScreen';
import { TagsScreen } from '@/screens/TagsScreen';
import { SourcesScreen } from '@/screens/SourcesScreen';
import { SecurityScreen } from '@/screens/SecurityScreen';
import { NotificationsScreen } from '@/screens/NotificationsScreen';
import { BackupScreen } from '@/screens/BackupScreen';
import { IntegrityScreen } from '@/screens/IntegrityScreen';
import { StorageScreen } from '@/screens/StorageScreen';
import { TrashScreen } from '@/screens/TrashScreen';
import { AboutScreen } from '@/screens/AboutScreen';
import { SurpriseScreen } from '@/screens/SurpriseScreen';
import { OnThisDayScreen } from '@/screens/OnThisDayScreen';
import { CapsulesScreen } from '@/screens/CapsulesScreen';
import { CapsuleEditorScreen } from '@/screens/CapsuleEditorScreen';
import { CapsuleDetailScreen } from '@/screens/CapsuleDetailScreen';
import { useShares } from '@/state/ShareContext';
import { syncNotifications } from '@/utils/notifications';
import { updateWidget } from '@/utils/native';
import { snippet } from '@/utils/search';
import { formatCivil } from '@/utils/date';

const TABS = [
  { to: '/', icon: 'home', label: 'Início', end: true },
  { to: '/memorias', icon: 'archive', label: 'Memórias', end: false },
  { to: '/entrada', icon: 'upload', label: 'Entrada', end: false, badge: true },
  { to: '/pessoas', icon: 'people', label: 'Pessoas', end: false },
  { to: '/mais', icon: 'list', label: 'Mais', end: false },
];

/** Rotas de tela cheia, sem a barra inferior. */
const FULLSCREEN = [
  /^\/memoria\/[^/]+\/editar$/,
  /^\/memoria\/nova$/,
  /^\/pessoa\/[^/]+\/editar$/,
  /^\/pessoa\/nova$/,
  /^\/capsula\/nova$/,
  /^\/capsula\/[^/]+\/editar$/,
  /^\/colecao\/nova$/,
  /^\/colecao\/[^/]+\/editar$/,
];

/** Reagenda as notificações e atualiza o widget quando os dados mudam. */
function useSideEffects() {
  const { ready, settings, memories, capsules, reminders, attachments } = useArchive();

  useEffect(() => {
    if (!ready) return;
    void syncNotifications(settings.notifications, { memories, capsules, reminders });
  }, [ready, settings.notifications, memories, capsules, reminders]);

  useEffect(() => {
    if (!ready) return;
    const featured = memories.length
      ? memories[Math.floor(Date.now() / 86400000) % memories.length]
      : null;
    void updateWidget({
      showContent: settings.widgetShowContent,
      title: featured?.title ?? '',
      text: featured ? snippet(featured.text, 140) : '',
      meta: featured
        ? formatCivil(featured.occurredAt, featured.occurredPrecision, featured.occurredNote)
        : '',
      imagePath: null,
    });
  }, [ready, settings.widgetShowContent, memories, attachments]);
}

export function App() {
  const { ready, error, settings, inbox } = useArchive();
  const { pending } = useShares();
  const location = useLocation();
  const { unlocked, unlock, lock } = useLock();
  useSideEffects();

  const locked = Boolean(settings.pinHash) && !unlocked;
  const pendingCount = inbox.length + pending.length;

  // Rebloqueia ao voltar do segundo plano, se o usuário pediu.
  useEffect(() => {
    if (!settings.pinHash || !settings.lockOnBackground) return undefined;
    const onHide = () => {
      if (document.visibilityState === 'hidden') lock();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [settings.pinHash, settings.lockOnBackground, lock]);

  if (!ready) {
    return (
      <div className="loading">
        <p className="serif">Abrindo o relicário…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page" style={{ paddingTop: 60 }}>
        <h1 className="serif">Não foi possível abrir o arquivo</h1>
        <p className="muted" style={{ marginTop: 10 }}>
          {error}
        </p>
        <p className="muted small">
          Em janelas anônimas ou com o armazenamento do site bloqueado, o Relicário não consegue
          guardar nada. Abra o aplicativo normalmente para continuar.
        </p>
      </div>
    );
  }

  if (locked) return <LockScreen onUnlock={unlock} />;

  const fullscreen = FULLSCREEN.some((re) => re.test(location.pathname));

  return (
    <div className="app-shell">
      <a className="skip-link" href="#conteudo">
        Ir para o conteúdo
      </a>
      <main className="app-main" id="conteudo" style={fullscreen ? { paddingBottom: 0 } : undefined}>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/memorias" element={<MemoriesScreen />} />
          <Route path="/memoria/nova" element={<MemoryEditorScreen />} />
          <Route path="/memoria/:id" element={<MemoryDetailScreen />} />
          <Route path="/memoria/:id/editar" element={<MemoryEditorScreen />} />
          <Route path="/entrada" element={<InboxScreen />} />
          <Route path="/pessoas" element={<PeopleScreen />} />
          <Route path="/pessoa/nova" element={<PersonEditorScreen />} />
          <Route path="/pessoa/:id" element={<PersonDetailScreen />} />
          <Route path="/pessoa/:id/editar" element={<PersonEditorScreen />} />
          <Route path="/mais" element={<MoreScreen />} />
          <Route path="/colecoes" element={<CollectionsScreen />} />
          <Route path="/colecao/nova" element={<CollectionEditorScreen />} />
          <Route path="/colecao/:id" element={<CollectionDetailScreen />} />
          <Route path="/colecao/:id/editar" element={<CollectionEditorScreen />} />
          <Route path="/abrigo" element={<HardDaysScreen />} />
          <Route path="/surpreenda" element={<SurpriseScreen />} />
          <Route path="/hoje-no-passado" element={<OnThisDayScreen />} />
          <Route path="/capsulas" element={<CapsulesScreen />} />
          <Route path="/capsula/nova" element={<CapsuleEditorScreen />} />
          <Route path="/capsula/:id" element={<CapsuleDetailScreen />} />
          <Route path="/capsula/:id/editar" element={<CapsuleEditorScreen />} />
          <Route path="/estatisticas" element={<StatsScreen />} />
          <Route path="/lixeira" element={<TrashScreen />} />
          <Route path="/configuracoes" element={<SettingsScreen />} />
          <Route path="/configuracoes/aparencia" element={<AppearanceScreen />} />
          <Route path="/configuracoes/inicio" element={<DisplayScreen />} />
          <Route path="/configuracoes/categorias" element={<CategoriesScreen />} />
          <Route path="/configuracoes/tags" element={<TagsScreen />} />
          <Route path="/configuracoes/origens" element={<SourcesScreen />} />
          <Route path="/configuracoes/seguranca" element={<SecurityScreen />} />
          <Route path="/configuracoes/notificacoes" element={<NotificationsScreen />} />
          <Route path="/configuracoes/backup" element={<BackupScreen />} />
          <Route path="/configuracoes/integridade" element={<IntegrityScreen />} />
          <Route path="/configuracoes/armazenamento" element={<StorageScreen />} />
          <Route path="/configuracoes/sobre" element={<AboutScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {!fullscreen && (
        <nav className="tabbar" aria-label="Navegação principal">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) => (isActive ? 'active' : undefined)}
            >
              <Icon name={tab.icon} />
              <span>{tab.label}</span>
              {tab.badge && pendingCount > 0 && (
                <span className="tab-badge" aria-label={`${pendingCount} pendentes`}>
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
