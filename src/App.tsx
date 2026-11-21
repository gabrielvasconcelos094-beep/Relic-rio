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
import { PeopleScreen } from '@/screens/PeopleScreen';
import { PersonDetailScreen } from '@/screens/PersonDetailScreen';
import { PersonEditorScreen } from '@/screens/PersonEditorScreen';
import { HardDaysScreen } from '@/screens/HardDaysScreen';
import { StatsScreen } from '@/screens/StatsScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { CategoriesScreen } from '@/screens/CategoriesScreen';
import { TagsScreen } from '@/screens/TagsScreen';
import { SecurityScreen } from '@/screens/SecurityScreen';
import { BackupScreen } from '@/screens/BackupScreen';
import { StorageScreen } from '@/screens/StorageScreen';
import { AboutScreen } from '@/screens/AboutScreen';
import { SurpriseScreen } from '@/screens/SurpriseScreen';
import { OnThisDayScreen } from '@/screens/OnThisDayScreen';
import { CapsulesScreen } from '@/screens/CapsulesScreen';
import { CapsuleEditorScreen } from '@/screens/CapsuleEditorScreen';
import { CapsuleDetailScreen } from '@/screens/CapsuleDetailScreen';

const TABS = [
  { to: '/', icon: 'home', label: 'Início', end: true },
  { to: '/memorias', icon: 'archive', label: 'Memórias', end: false },
  { to: '/pessoas', icon: 'people', label: 'Pessoas', end: false },
  { to: '/abrigo', icon: 'shelter', label: 'Dias difíceis', end: false },
  { to: '/estatisticas', icon: 'chart', label: 'Estatísticas', end: false },
];

/** Rotas de tela cheia, sem a barra inferior. */
const FULLSCREEN = [
  /^\/memoria\/[^/]+\/editar$/,
  /^\/memoria\/nova$/,
  /^\/pessoa\/[^/]+\/editar$/,
  /^\/pessoa\/nova$/,
  /^\/capsula\/nova$/,
  /^\/capsula\/[^/]+\/editar$/,
];

function useThemeEffect() {
  const { settings } = useArchive();
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = settings.theme === 'dark' || (settings.theme === 'system' && media.matches);
      root.dataset.theme = dark ? 'dark' : 'light';
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [settings.theme]);
}

export function App() {
  const { ready, error, settings } = useArchive();
  const location = useLocation();
  const { unlocked, unlock, lock } = useLock();
  useThemeEffect();

  const locked = Boolean(settings.pinHash) && !unlocked;

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
        <p className="muted" style={{ marginTop: 10 }}>{error}</p>
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
      <main className="app-main" style={fullscreen ? { paddingBottom: 0 } : undefined}>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/memorias" element={<MemoriesScreen />} />
          <Route path="/memoria/nova" element={<MemoryEditorScreen />} />
          <Route path="/memoria/:id" element={<MemoryDetailScreen />} />
          <Route path="/memoria/:id/editar" element={<MemoryEditorScreen />} />
          <Route path="/pessoas" element={<PeopleScreen />} />
          <Route path="/pessoa/nova" element={<PersonEditorScreen />} />
          <Route path="/pessoa/:id" element={<PersonDetailScreen />} />
          <Route path="/pessoa/:id/editar" element={<PersonEditorScreen />} />
          <Route path="/abrigo" element={<HardDaysScreen />} />
          <Route path="/surpreenda" element={<SurpriseScreen />} />
          <Route path="/hoje-no-passado" element={<OnThisDayScreen />} />
          <Route path="/capsulas" element={<CapsulesScreen />} />
          <Route path="/capsula/nova" element={<CapsuleEditorScreen />} />
          <Route path="/capsula/:id" element={<CapsuleDetailScreen />} />
          <Route path="/capsula/:id/editar" element={<CapsuleEditorScreen />} />
          <Route path="/estatisticas" element={<StatsScreen />} />
          <Route path="/configuracoes" element={<SettingsScreen />} />
          <Route path="/configuracoes/categorias" element={<CategoriesScreen />} />
          <Route path="/configuracoes/tags" element={<TagsScreen />} />
          <Route path="/configuracoes/seguranca" element={<SecurityScreen />} />
          <Route path="/configuracoes/backup" element={<BackupScreen />} />
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
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
