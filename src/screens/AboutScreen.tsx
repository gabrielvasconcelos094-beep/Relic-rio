import { TopBar } from '@/components/ui';
import { Icon } from '@/components/Icon';

export function AboutScreen() {
  return (
    <>
      <TopBar title="Sobre" />
      <div className="page stack-lg" style={{ paddingTop: 6 }}>
        <header>
          <Icon name="box" size={28} style={{ color: 'var(--accent)' }} />
          <h1 className="serif" style={{ marginTop: 10 }}>
            Relicário
          </h1>
          <p className="muted small" style={{ marginTop: 6 }}>
            Um arquivo pessoal de afeto, palavras e memórias. Versão 2.0.
          </p>
        </header>

        <section className="card card-pad">
          <p className="small">
            Um relicário guarda o que é precioso. Este guarda as palavras que alguém lhe disse, os
            gestos que alguém fez, as fotografias, as cartas e os pequenos acontecimentos que você
            não quer esquecer.
          </p>
        </section>

        <section>
          <div className="section-title" style={{ marginTop: 0 }}>
            <h2>Privacidade</h2>
          </div>
          <div className="card card-pad stack" style={{ gap: 10 }}>
            {[
              'Tudo é guardado no próprio aparelho, em banco de dados local.',
              'Não existe conta, login ou sincronização.',
              'Nenhum registro, texto ou arquivo é enviado para servidores.',
              'Nenhum dado é coletado, analisado ou usado para publicidade.',
              'O aplicativo funciona sem conexão com a internet.',
              'Os backups são gerados por você e ficam onde você escolher.',
              'O texto de PDFs é extraído no próprio aparelho, só para a busca.',
              'As notificações são locais, agendadas pelo Android, sem servidor.',
            ].map((line) => (
              <div key={line} className="row" style={{ alignItems: 'flex-start' }}>
                <Icon name="check" size={16} style={{ color: 'var(--sage)', marginTop: 3 }} />
                <span className="small" style={{ flex: 1 }}>
                  {line}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="section-title" style={{ marginTop: 0 }}>
            <h2>Limites honestos</h2>
          </div>
          <div className="card card-pad">
            <p className="small muted">
              As notificações, o recebimento por compartilhamento e o widget da tela inicial
              funcionam no aplicativo Android instalado. Abrindo pelo navegador, o Relicário avisa
              que esses recursos estão indisponíveis em vez de fingir que funcionam.
            </p>
            <p className="small muted" style={{ marginTop: 10 }}>
              As cápsulas também geram um lembrete de calendário (.ics) que você adiciona ao
              calendário do aparelho — útil mesmo com as notificações desligadas.
            </p>
            <p className="small muted" style={{ marginTop: 10 }}>
              A biometria depende do suporte do aparelho. Quando ele não oferece, a opção aparece
              desativada e o PIN continua funcionando.
            </p>
            <p className="small muted" style={{ marginTop: 10 }}>
              Não há OCR: o texto é extraído de PDFs que já contêm texto e de arquivos de texto.
              Imagens e documentos digitalizados não são processados.
            </p>
            <p className="small muted" style={{ marginTop: 10 }}>
              Se o armazenamento do aplicativo for apagado nas configurações do sistema, os
              registros vão com ele. Faça backups — e guarde bem a senha, se usar um backup
              criptografado: sem ela não há recuperação.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
