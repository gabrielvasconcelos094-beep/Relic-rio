import { useEffect, useState } from 'react';
import { useArchive } from '@/state/ArchiveContext';
import { useUi } from '@/state/UiContext';
import { Icon } from '@/components/Icon';
import { TopBar, Switch, EmptyState } from '@/components/ui';
import {
  checkPermission,
  notificationsSupported,
  planNotifications,
  requestPermission,
  syncNotifications,
  type PermissionState,
} from '@/utils/notifications';
import { formatCivil } from '@/utils/date';

export function NotificationsScreen() {
  const { settings, updateSettings, memories, capsules, reminders, deleteReminder, saveReminder } =
    useArchive();
  const { toast, confirm } = useUi();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<PermissionState>('prompt');
  const [busy, setBusy] = useState(false);

  const prefs = settings.notifications;

  useEffect(() => {
    void (async () => {
      const ok = await notificationsSupported();
      setSupported(ok);
      if (ok) setPermission(await checkPermission());
    })();
  }, []);

  // Quantas notificações seriam agendadas com as preferências atuais.
  const planned = planNotifications(prefs, { memories, capsules, reminders }).length;

  const patch = async (p: Partial<typeof prefs>) => {
    const next = { ...prefs, ...p };
    await updateSettings({ notifications: next });
    if (supported) {
      setBusy(true);
      const result = await syncNotifications(next, { memories, capsules, reminders });
      setBusy(false);
      setPermission(result.permission);
      if (result.reason && next.enabled) toast(result.reason, 'error');
    }
  };

  const enable = async (value: boolean) => {
    if (value && supported) {
      const state = await requestPermission();
      setPermission(state);
      if (state !== 'granted') {
        toast('O Android não autorizou as notificações. Verifique as permissões do aplicativo.', 'error');
        return;
      }
    }
    await patch({ enabled: value });
  };

  return (
    <>
      <TopBar title="Notificações" />
      <div className="page stack-lg" style={{ paddingTop: 6 }}>
        <p className="muted small">
          São notificações locais, agendadas pelo próprio aparelho. Nada é enviado para servidores,
          e o conteúdo das memórias só aparece se você autorizar.
        </p>

        {supported === false && (
          <section className="card card-pad">
            <div className="row">
              <Icon name="info" size={17} style={{ color: 'var(--terracotta)' }} />
              <strong className="small" style={{ flex: 1 }}>
                Indisponível nesta forma de uso
              </strong>
            </div>
            <p className="tiny faint" style={{ marginTop: 6 }}>
              As notificações locais funcionam no aplicativo Android instalado. Abrindo o Relicário
              pelo navegador, os lembretes continuam guardados, mas o sistema não os dispara.
            </p>
          </section>
        )}

        <section className="card card-pad">
          <Switch
            label="Ativar notificações"
            description={
              permission === 'denied'
                ? 'O Android está bloqueando as notificações deste aplicativo.'
                : 'Lembranças discretas, no horário que você escolher.'
            }
            checked={prefs.enabled}
            disabled={supported === false || busy}
            onChange={(v) => void enable(v)}
          />
          {prefs.enabled && (
            <>
              <Switch
                label="Hoje, no passado"
                description="Quando houver memórias registradas na mesma data em anos anteriores."
                checked={prefs.onThisDay}
                disabled={busy}
                onChange={(v) => void patch({ onThisDay: v })}
              />
              <Switch
                label="Cartas para o futuro"
                description="Quando uma cápsula chegar à data que você definiu."
                checked={prefs.capsules}
                disabled={busy}
                onChange={(v) => void patch({ capsules: v })}
              />
              <Switch
                label="Lembretes que eu criar"
                description="Para revisitar uma coleção ou uma memória."
                checked={prefs.reminders}
                disabled={busy}
                onChange={(v) => void patch({ reminders: v })}
              />
            </>
          )}
        </section>

        {prefs.enabled && (
          <>
            <section>
              <div className="section-title" style={{ marginTop: 0 }}>
                <h2>Privacidade</h2>
              </div>
              <div className="card card-pad">
                <Switch
                  label="Mostrar o conteúdo na notificação"
                  description={
                    prefs.showContent
                      ? 'O título e um trecho da memória podem aparecer na tela bloqueada.'
                      : 'A notificação só avisa que há algo guardado, sem revelar o quê.'
                  }
                  checked={prefs.showContent}
                  disabled={busy}
                  onChange={(v) => void patch({ showContent: v })}
                />
              </div>
              <p className="tiny faint" style={{ marginTop: 8 }}>
                Exemplo do que o aparelho mostraria:{' '}
                <em>
                  {prefs.showContent
                    ? '“Hoje, no passado — Há dois anos: Carta da Ana.”'
                    : '“Hoje, no passado — há uma memória guardada nesta data.”'}
                </em>
              </p>
            </section>

            <section>
              <div className="section-title" style={{ marginTop: 0 }}>
                <h2>Horário</h2>
              </div>
              <div className="field">
                <label htmlFor="hora">Avisar às</label>
                <input
                  id="hora"
                  type="time"
                  className="input"
                  value={prefs.time}
                  disabled={busy}
                  onChange={(e) => void patch({ time: e.target.value })}
                />
                <span className="hint">
                  Horário local do aparelho. O agendamento é refeito quando você abre o aplicativo,
                  o que evita avisos repetidos ou fora de hora após mudança de fuso.
                </span>
              </div>
            </section>

            <section className="card card-pad">
              <div className="row">
                <Icon name="clock" size={17} />
                <span className="small" style={{ flex: 1 }}>
                  Agendadas a partir de agora
                </span>
                <strong>{planned}</strong>
              </div>
              <p className="tiny faint" style={{ marginTop: 6 }}>
                Inclui os próximos 30 dias de “hoje, no passado”, as cápsulas ainda fechadas e os
                seus lembretes.
              </p>
            </section>
          </>
        )}

        <section>
          <div className="section-title" style={{ marginTop: 0 }}>
            <h2>Meus lembretes</h2>
            <span className="tiny faint">{reminders.length}</span>
          </div>
          {reminders.length === 0 ? (
            <EmptyState
              icon="clock"
              title="Nenhum lembrete"
              description="Numa coleção ou memória, use “Lembrar de revisitar” para criar um."
            />
          ) : (
            <div className="card card-pad list-divided">
              {reminders.map((r) => (
                <div key={r.id} className="link-row">
                  <Icon name="clock" />
                  <span className="label">
                    <strong>{r.title}</strong>
                    <span>
                      {formatCivil(r.at)} às {r.time}
                      {!r.enabled ? ' · desativado' : ''}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={r.enabled ? `Desativar ${r.title}` : `Ativar ${r.title}`}
                    onClick={() => void saveReminder({ ...r, enabled: !r.enabled })}
                  >
                    <Icon name={r.enabled ? 'check' : 'close'} size={17} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Apagar ${r.title}`}
                    onClick={async () => {
                      const ok = await confirm({
                        title: 'Apagar lembrete',
                        message: `“${r.title}” não será mais lembrado.`,
                        confirmLabel: 'Apagar',
                        destructive: true,
                      });
                      if (ok) {
                        await deleteReminder(r.id);
                        toast('Lembrete apagado.');
                      }
                    }}
                  >
                    <Icon name="trash" size={17} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
