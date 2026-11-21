import { useArchive } from '@/state/ArchiveContext';
import { TopBar, Switch } from '@/components/ui';
import type { DefaultSort } from '@/db/types';

const SORTS: { key: DefaultSort; label: string }[] = [
  { key: 'occurred-desc', label: 'Acontecimento mais recente primeiro' },
  { key: 'occurred-asc', label: 'Acontecimento mais antigo primeiro' },
  { key: 'created-desc', label: 'Guardado há menos tempo primeiro' },
  { key: 'title-asc', label: 'Por título, de A a Z' },
];

export function DisplayScreen() {
  const { settings, updateSettings } = useArchive();

  return (
    <>
      <TopBar title="Tela inicial e listas" />
      <div className="page stack-lg" style={{ paddingTop: 6 }}>
        <section>
          <div className="section-title" style={{ marginTop: 0 }}>
            <h2>Tela inicial</h2>
          </div>
          <div className="card card-pad">
            <Switch
              label="Memória do dia"
              description="Um registro em destaque na abertura, escolhido a cada dia."
              checked={settings.homeShowFeatured}
              onChange={(v) => void updateSettings({ homeShowFeatured: v })}
            />
            <Switch
              label="Atalhos rápidos"
              description="Hoje no passado, Surpreenda-me, dias difíceis e cartas para o futuro."
              checked={settings.homeShowQuickTiles}
              onChange={(v) => void updateSettings({ homeShowQuickTiles: v })}
            />
            <Switch
              label="Guardado recentemente"
              description="Os últimos registros adicionados ao arquivo."
              checked={settings.homeShowRecent}
              onChange={(v) => void updateSettings({ homeShowRecent: v })}
            />
          </div>
        </section>

        <section>
          <div className="section-title" style={{ marginTop: 0 }}>
            <h2>Ordem padrão do arquivo</h2>
          </div>
          <div className="card card-pad list-divided">
            {SORTS.map((sort) => (
              <button
                key={sort.key}
                type="button"
                className="link-row"
                aria-pressed={settings.defaultSort === sort.key}
                onClick={() => void updateSettings({ defaultSort: sort.key })}
              >
                <span className="label">
                  <strong>{sort.label}</strong>
                </span>
                {settings.defaultSort === sort.key && (
                  <span className="chip" style={{ borderColor: 'var(--accent)' }}>
                    Em uso
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="section-title" style={{ marginTop: 0 }}>
            <h2>Busca</h2>
          </div>
          <div className="card card-pad">
            <Switch
              label="Procurar dentro de PDFs e textos"
              description="O texto é extraído no próprio aparelho quando o arquivo é anexado, e passa a ser encontrável pela busca. Nenhum documento sai daqui."
              checked={settings.extractPdfText}
              onChange={(v) => void updateSettings({ extractPdfText: v })}
            />
          </div>
        </section>

        <section>
          <p className="tiny faint">
            As cores, o tamanho da letra, a densidade das listas e as colunas da galeria ficam em
            Configurações → Aparência.
          </p>
        </section>
      </div>
    </>
  );
}
