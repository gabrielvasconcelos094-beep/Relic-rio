import { Link } from 'react-router-dom';
import { useArchive } from '@/state/ArchiveContext';
import { THEMES } from '@/state/ThemeContext';
import { Icon } from '@/components/Icon';
import { Switch } from '@/components/ui';

export function SettingsScreen() {
  const { settings, updateSettings, trash } = useArchive();
  const themeName =
    settings.theme === 'custom'
      ? 'Minhas cores'
      : (THEMES.find((t) => t.id === settings.theme)?.name ?? 'Relicário');
  const modeName =
    settings.mode === 'system' ? 'automático' : settings.mode === 'dark' ? 'escuro' : 'claro';

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
          <div className="card card-pad list-divided">
            <Link to="/configuracoes/aparencia" className="link-row">
              <Icon name={settings.mode === 'dark' ? 'moon' : 'sun'} />
              <span className="label">
                <strong>Tema e tipografia</strong>
                <span>
                  {themeName} · modo {modeName}
                </span>
              </span>
              <Icon name="forward" />
            </Link>
            <Link to="/configuracoes/inicio" className="link-row">
              <Icon name="home" />
              <span className="label">
                <strong>Tela inicial e listas</strong>
                <span>O que aparece ao abrir o aplicativo</span>
              </span>
              <Icon name="forward" />
            </Link>
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
            <Link to="/configuracoes/notificacoes" className="link-row">
              <Icon name="clock" />
              <span className="label">
                <strong>Notificações e lembretes</strong>
                <span>
                  {settings.notifications.enabled
                    ? settings.notifications.showContent
                      ? 'Ativas, mostrando o conteúdo'
                      : 'Ativas, sem revelar o conteúdo'
                    : 'Desativadas'}
                </span>
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
            <Switch
              label="Widget pode mostrar conteúdo"
              description="Quando desligado, o widget da tela inicial mostra apenas um atalho."
              checked={settings.widgetShowContent}
              onChange={(v) => void updateSettings({ widgetShowContent: v })}
            />
          </div>
        </section>

        <section>
          <div className="section-title" style={{ marginTop: 0 }}>
            <h2>Preservação</h2>
          </div>
          <div className="card card-pad list-divided">
            <Link to="/configuracoes/backup" className="link-row">
              <Icon name="download" />
              <span className="label">
                <strong>Backup, exportação e importação</strong>
                <span>Arquivo completo, com ou sem senha</span>
              </span>
              <Icon name="forward" />
            </Link>
            <Link to="/configuracoes/integridade" className="link-row">
              <Icon name="check" />
              <span className="label">
                <strong>Verificar integridade</strong>
                <span>Procura anexos ausentes e referências quebradas</span>
              </span>
              <Icon name="forward" />
            </Link>
            <Link to="/lixeira" className="link-row">
              <Icon name="trash" />
              <span className="label">
                <strong>Lixeira</strong>
                <span>
                  {trash.length === 0
                    ? 'Vazia'
                    : `${trash.length} ${trash.length === 1 ? 'registro' : 'registros'} recuperáveis`}
                </span>
              </span>
              <Icon name="forward" />
            </Link>
            <Link to="/configuracoes/armazenamento" className="link-row">
              <Icon name="archive" />
              <span className="label">
                <strong>Armazenamento</strong>
                <span>Espaço usado, arquivos grandes e órfãos</span>
              </span>
              <Icon name="forward" />
            </Link>
          </div>
        </section>

        <section>
          <div className="section-title" style={{ marginTop: 0 }}>
            <h2>Organização</h2>
          </div>
          <div className="card card-pad list-divided">
            <Link to="/configuracoes/categorias" className="link-row">
              <Icon name="tag" />
              <span className="label">
                <strong>Categorias</strong>
                <span>Criar, renomear e remover</span>
              </span>
              <Icon name="forward" />
            </Link>
            <Link to="/colecoes" className="link-row">
              <Icon name="book" />
              <span className="label">
                <strong>Coleções</strong>
                <span>Agrupamentos criados por você</span>
              </span>
              <Icon name="forward" />
            </Link>
            <Link to="/configuracoes/tags" className="link-row">
              <Icon name="tag" />
              <span className="label">
                <strong>Tags</strong>
                <span>Renomear e apagar em todos os registros</span>
              </span>
              <Icon name="forward" />
            </Link>
            <Link to="/configuracoes/origens" className="link-row">
              <Icon name="letter" />
              <span className="label">
                <strong>Origens</strong>
                <span>De onde as memórias vieram</span>
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
