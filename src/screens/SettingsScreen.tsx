import { Link } from 'react-router-dom';
import { useArchive } from '@/state/ArchiveContext';
import { Icon } from '@/components/Icon';
import { Switch } from '@/components/ui';
import type { ThemeMode } from '@/db/types';

const THEMES: { key: ThemeMode; label: string; icon: string }[] = [
  { key: 'light', label: 'Claro', icon: 'sun' },
  { key: 'dark', label: 'Escuro', icon: 'moon' },
  { key: 'system', label: 'Sistema', icon: 'settings' },
];

export function SettingsScreen() {
  const { settings, updateSettings } = useArchive();

  return (
    <>
      <div className="page-head">
        <div className="eyebrow">Relicário</div>
        <h1 className="serif">Configurações</h1>
      </div>

      <div className="page stack-lg">
        <section>
          <div className="section-title" style={{ marginTop: 0 }}>
            <h2>Aparência</h2>
          </div>
          <div className="segmented" role="group" aria-label="Tema">
            {THEMES.map((t) => (
              <button
                key={t.key}
                type="button"
                aria-pressed={settings.theme === t.key}
                onClick={() => void updateSettings({ theme: t.key })}
              >
                {t.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="section-title" style={{ marginTop: 0 }}>
            <h2>Privacidade</h2>
          </div>
          <div className="card card-pad">
            <Link to="/configuracoes/seguranca" className="link-row">
              <Icon name="lock" />
              <span className="label">
                <strong>Proteção do aplicativo</strong>
                <span>{settings.pinHash ? 'PIN ativo' : 'Sem PIN'}</span>
              </span>
              <Icon name="forward" />
            </Link>
            <Switch
              label="Bloquear ao sair do aplicativo"
              description="Pede o PIN novamente quando o aplicativo volta ao primeiro plano."
              checked={settings.lockOnBackground}
              disabled={!settings.pinHash}
              onChange={(v) => void updateSettings({ lockOnBackground: v })}
            />
          </div>
        </section>

        <section>
          <div className="section-title" style={{ marginTop: 0 }}>
            <h2>Arquivo</h2>
          </div>
          <div className="card card-pad list-divided">
            <Link to="/configuracoes/backup" className="link-row">
              <Icon name="download" />
              <span className="label">
                <strong>Backup, exportação e importação</strong>
                <span>Gerar o arquivo completo e restaurá-lo</span>
              </span>
              <Icon name="forward" />
            </Link>
            <Link to="/configuracoes/categorias" className="link-row">
              <Icon name="tag" />
              <span className="label">
                <strong>Categorias</strong>
                <span>Criar, renomear e remover</span>
              </span>
              <Icon name="forward" />
            </Link>
            <Link to="/configuracoes/tags" className="link-row">
              <Icon name="tag" />
              <span className="label">
                <strong>Tags</strong>
                <span>Renomear e apagar tags em todos os registros</span>
              </span>
              <Icon name="forward" />
            </Link>
            <Link to="/configuracoes/armazenamento" className="link-row">
              <Icon name="archive" />
              <span className="label">
                <strong>Armazenamento</strong>
                <span>Espaço usado e limpeza do arquivo</span>
              </span>
              <Icon name="forward" />
            </Link>
            <Link to="/capsulas" className="link-row">
              <Icon name="capsule" />
              <span className="label">
                <strong>Cartas para o futuro</strong>
              </span>
              <Icon name="forward" />
            </Link>
          </div>
        </section>

        <section>
          <div className="card card-pad">
            <Link to="/configuracoes/sobre" className="link-row">
              <Icon name="info" />
              <span className="label">
                <strong>Sobre o Relicário</strong>
              </span>
              <Icon name="forward" />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
