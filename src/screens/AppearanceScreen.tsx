import { useEffect, useMemo, useState } from 'react';
import { useArchive } from '@/state/ArchiveContext';
import { useUi } from '@/state/UiContext';
import {
  BASE_PALETTES,
  FONT_SCALES,
  PALETTE_FIELDS,
  THEMES,
  useTheme,
} from '@/state/ThemeContext';
import type { FontScale, ListDensity, MemoryViewStyle, Palette, ThemeId, ThemeMode } from '@/db/types';
import { Icon } from '@/components/Icon';
import { TopBar, Sheet } from '@/components/ui';
import { contrastLevel, contrastRatio, isHex, normalizeHex, suggestAccessible } from '@/utils/color';

const MODES: { key: ThemeMode; label: string }[] = [
  { key: 'light', label: 'Claro' },
  { key: 'dark', label: 'Escuro' },
  { key: 'system', label: 'Automático' },
];

/** Pares que precisam de contraste suficiente para o texto ficar legível. */
const CONTRAST_PAIRS: { fg: keyof Palette; bg: keyof Palette; label: string; large?: boolean }[] = [
  { fg: 'ink', bg: 'paper', label: 'Texto principal sobre o fundo' },
  { fg: 'ink', bg: 'paperRaised', label: 'Texto principal sobre cartões' },
  { fg: 'inkSoft', bg: 'paperRaised', label: 'Texto secundário sobre cartões' },
  { fg: 'inkFaint', bg: 'paper', label: 'Texto discreto sobre o fundo', large: true },
  { fg: 'accent', bg: 'paper', label: 'Cor principal sobre o fundo', large: true },
];

function ContrastRow({
  palette,
  pair,
  onFix,
}: {
  palette: Palette;
  pair: (typeof CONTRAST_PAIRS)[number];
  onFix: (key: keyof Palette, value: string) => void;
}) {
  const ratio = contrastRatio(palette[pair.fg], palette[pair.bg]);
  if (ratio === null) return null;
  const level = contrastLevel(ratio, pair.large);
  const bad = level === 'insuficiente';
  const suggestion = bad
    ? suggestAccessible(palette[pair.fg], palette[pair.bg], pair.large ? 3 : 4.5)
    : null;

  return (
    <div style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
      <div className="row">
        <span className="small" style={{ flex: 1 }}>
          {pair.label}
        </span>
        <span className={bad ? 'contrast-pill bad' : 'contrast-pill ok'}>
          {ratio.toFixed(1)}:1 · {level}
        </span>
      </div>
      {bad && suggestion && (
        <div className="row" style={{ marginTop: 6 }}>
          <span className="tiny faint" style={{ flex: 1 }}>
            Difícil de ler. Uma alternativa próxima seria {suggestion}.
          </span>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => onFix(pair.fg, suggestion)}
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  );
}

function PaletteEditor({
  palette,
  onChange,
}: {
  palette: Palette;
  onChange: (p: Palette) => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const set = (key: keyof Palette, value: string) => {
    onChange({ ...palette, [key]: normalizeHex(value) });
  };

  return (
    <div>
      {PALETTE_FIELDS.map((field) => {
        const current = palette[field.key];
        const draft = drafts[field.key] ?? current;
        const invalid = draft !== current && !isHex(draft);
        return (
          <div key={field.key} className="swatch-row">
            <label className="swatch-chip" aria-label={`Escolher ${field.label}`}>
              <input
                type="color"
                value={current}
                onChange={(e) => {
                  setDrafts((d) => ({ ...d, [field.key]: e.target.value }));
                  set(field.key, e.target.value);
                }}
              />
            </label>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="small">{field.label}</div>
              <div className="tiny faint">{field.hint}</div>
            </div>
            <input
              className={invalid ? 'input hex-input input-error' : 'input hex-input'}
              aria-label={`Código hexadecimal de ${field.label}`}
              value={draft}
              spellCheck={false}
              onChange={(e) => {
                const value = e.target.value;
                setDrafts((d) => ({ ...d, [field.key]: value }));
                if (isHex(value)) set(field.key, value);
              }}
              onBlur={() => setDrafts((d) => ({ ...d, [field.key]: palette[field.key] }))}
            />
          </div>
        );
      })}
    </div>
  );
}

/** Amostra viva da interface, pintada com a paleta em edição. */
function Preview() {
  return (
    <div className="preview-frame">
      <div style={{ padding: 14, background: 'var(--paper)' }}>
        <div className="eyebrow">Relicário</div>
        <h3 className="serif" style={{ marginBottom: 8 }}>
          Carta da Ana
        </h3>
        <div className="card card-pad" style={{ marginBottom: 10 }}>
          <p className="small" style={{ fontFamily: 'var(--font-display)' }}>
            Obrigada por ter ficado. Você é das pessoas que eu escolheria de novo.
          </p>
        </div>
        <div className="row-wrap" style={{ marginBottom: 10 }}>
          <span className="chip">
            <span className="chip-dot" style={{ background: 'var(--cat-rosa)' }} />
            Afeto
          </span>
          <span className="chip tag-chip">carta</span>
        </div>
        <div className="row">
          <button type="button" className="btn btn-sm btn-primary" tabIndex={-1}>
            Botão principal
          </button>
          <button type="button" className="btn btn-sm" tabIndex={-1}>
            Secundário
          </button>
        </div>
        <p className="tiny faint" style={{ marginTop: 10 }}>
          Texto discreto, como as datas e os metadados.
        </p>
      </div>
    </div>
  );
}

export function AppearanceScreen() {
  const { settings, updateSettings } = useArchive();
  const { resolvedMode, setPreview } = useTheme();
  const { toast, confirm } = useUi();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editMode, setEditMode] = useState<'light' | 'dark'>(resolvedMode);
  const [draft, setDraft] = useState<Palette>(
    () =>
      (resolvedMode === 'dark' ? settings.customDark : settings.customLight) ??
      BASE_PALETTES[resolvedMode],
  );

  // Enquanto o editor está aberto, o aplicativo inteiro mostra a paleta em edição.
  useEffect(() => {
    if (editorOpen) setPreview({ theme: 'custom', palette: draft, mode: editMode });
    else setPreview(null);
    return () => setPreview(null);
  }, [editorOpen, draft, editMode, setPreview]);

  const problems = useMemo(
    () =>
      CONTRAST_PAIRS.filter((pair) => {
        const ratio = contrastRatio(draft[pair.fg], draft[pair.bg]);
        return ratio !== null && contrastLevel(ratio, pair.large) === 'insuficiente';
      }).length,
    [draft],
  );

  const openEditor = (mode: 'light' | 'dark') => {
    setEditMode(mode);
    setDraft((mode === 'dark' ? settings.customDark : settings.customLight) ?? BASE_PALETTES[mode]);
    setEditorOpen(true);
  };

  const saveCustom = async () => {
    await updateSettings({
      theme: 'custom',
      ...(editMode === 'dark' ? { customDark: draft } : { customLight: draft }),
    });
    setEditorOpen(false);
    toast('Tema personalizado salvo.');
  };

  const resetCustom = async () => {
    const ok = await confirm({
      title: 'Restaurar cores originais',
      message: 'As cores personalizadas deste modo voltam ao ponto de partida.',
      confirmLabel: 'Restaurar',
    });
    if (!ok) return;
    setDraft(BASE_PALETTES[editMode]);
  };

  return (
    <>
      <TopBar title="Aparência" />
      <div className="page stack-lg" style={{ paddingTop: 6 }}>
        <section>
          <div className="section-title" style={{ marginTop: 0 }}>
            <h2>Tema</h2>
          </div>
          <div className="stack">
            {THEMES.map((theme) => {
              const swatch = theme.swatch[resolvedMode];
              return (
                <button
                  key={theme.id}
                  type="button"
                  className="theme-card"
                  aria-pressed={settings.theme === theme.id}
                  onClick={() => void updateSettings({ theme: theme.id as ThemeId })}
                >
                  <div className="theme-swatches" aria-hidden="true">
                    {swatch.map((color, i) => (
                      <span key={i} style={{ background: color }} />
                    ))}
                  </div>
                  <div className="row">
                    <strong style={{ flex: 1, fontSize: '0.95rem' }}>{theme.name}</strong>
                    {settings.theme === theme.id && (
                      <Icon name="check" size={17} style={{ color: 'var(--accent)' }} />
                    )}
                  </div>
                  <p className="tiny faint" style={{ marginTop: 3 }}>
                    {theme.description}
                  </p>
                </button>
              );
            })}

            <button
              type="button"
              className="theme-card"
              aria-pressed={settings.theme === 'custom'}
              onClick={() => openEditor(resolvedMode)}
            >
              <div className="theme-swatches" aria-hidden="true">
                <span
                  style={{
                    background:
                      (resolvedMode === 'dark' ? settings.customDark : settings.customLight)
                        ?.paper ?? BASE_PALETTES[resolvedMode].paper,
                  }}
                />
                <span
                  style={{
                    background:
                      (resolvedMode === 'dark' ? settings.customDark : settings.customLight)
                        ?.paperRaised ?? BASE_PALETTES[resolvedMode].paperRaised,
                  }}
                />
                <span
                  style={{
                    background:
                      (resolvedMode === 'dark' ? settings.customDark : settings.customLight)
                        ?.accent ?? BASE_PALETTES[resolvedMode].accent,
                  }}
                />
              </div>
              <div className="row">
                <strong style={{ flex: 1, fontSize: '0.95rem' }}>Personalizar minhas cores</strong>
                {settings.theme === 'custom' && (
                  <Icon name="check" size={17} style={{ color: 'var(--accent)' }} />
                )}
              </div>
              <p className="tiny faint" style={{ marginTop: 3 }}>
                Escolha cada cor da interface, com pré-visualização e conferência de legibilidade.
              </p>
            </button>
          </div>
        </section>

        <section>
          <div className="section-title" style={{ marginTop: 0 }}>
            <h2>Modo</h2>
          </div>
          <div className="segmented" role="group" aria-label="Modo claro ou escuro">
            {MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                aria-pressed={settings.mode === m.key}
                onClick={() => void updateSettings({ mode: m.key })}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="tiny faint" style={{ marginTop: 8 }}>
            Cada tema tem uma versão clara e uma escura próprias — a identidade continua a mesma
            nos dois modos.
          </p>
          {settings.theme === 'custom' && (
            <div className="row" style={{ marginTop: 10 }}>
              <button type="button" className="btn btn-sm" onClick={() => openEditor('light')}>
                Editar cores do modo claro
              </button>
              <button type="button" className="btn btn-sm" onClick={() => openEditor('dark')}>
                Modo escuro
              </button>
            </div>
          )}
        </section>

        <section>
          <div className="section-title" style={{ marginTop: 0 }}>
            <h2>Tamanho da letra</h2>
          </div>
          <div className="segmented" role="group" aria-label="Tamanho da fonte">
            {(Object.keys(FONT_SCALES) as FontScale[]).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={settings.fontScale === key}
                onClick={() => void updateSettings({ fontScale: key })}
              >
                {FONT_SCALES[key].label}
              </button>
            ))}
          </div>
          <p className="small" style={{ marginTop: 10 }}>
            Assim fica o texto do aplicativo neste tamanho.
          </p>
        </section>

        <section>
          <div className="section-title" style={{ marginTop: 0 }}>
            <h2>Listas e cartões</h2>
          </div>
          <div className="card card-pad stack">
            <div className="field">
              <label>Densidade da lista</label>
              <div className="segmented" role="group" aria-label="Densidade da lista">
                {(['comfortable', 'compact'] as ListDensity[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={settings.listDensity === d}
                    onClick={() => void updateSettings({ listDensity: d })}
                  >
                    {d === 'comfortable' ? 'Confortável' : 'Compacta'}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Estilo das memórias</label>
              <div className="segmented" role="group" aria-label="Estilo de visualização">
                {(['card', 'quiet'] as MemoryViewStyle[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={settings.memoryViewStyle === s}
                    onClick={() => void updateSettings({ memoryViewStyle: s })}
                  >
                    {s === 'card' ? 'Cartões' : 'Discreto'}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label htmlFor="galeria-colunas">Colunas na galeria</label>
              <div className="segmented" role="group" aria-label="Colunas da galeria">
                {[2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={settings.galleryColumns === n}
                    onClick={() => void updateSettings({ galleryColumns: n })}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="section-title" style={{ marginTop: 0 }}>
            <h2>Pré-visualização</h2>
          </div>
          <Preview />
        </section>
      </div>

      <Sheet
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={`Minhas cores — modo ${editMode === 'dark' ? 'escuro' : 'claro'}`}
      >
        <div className="stack-lg">
          <p className="tiny faint">
            As alterações aparecem no aplicativo inteiro enquanto você edita. Nada é salvo até você
            confirmar, e nenhum registro é afetado por mudar de aparência.
          </p>

          <div className="segmented" role="group" aria-label="Modo a editar">
            <button
              type="button"
              aria-pressed={editMode === 'light'}
              onClick={() => {
                setEditMode('light');
                setDraft(settings.customLight ?? BASE_PALETTES.light);
              }}
            >
              Claro
            </button>
            <button
              type="button"
              aria-pressed={editMode === 'dark'}
              onClick={() => {
                setEditMode('dark');
                setDraft(settings.customDark ?? BASE_PALETTES.dark);
              }}
            >
              Escuro
            </button>
          </div>

          <Preview />

          <PaletteEditor palette={draft} onChange={setDraft} />

          <div>
            <div className="section-title" style={{ marginTop: 0 }}>
              <h2>Legibilidade</h2>
              {problems > 0 && (
                <span className="tiny" style={{ color: 'var(--danger)' }}>
                  {problems} {problems === 1 ? 'combinação difícil' : 'combinações difíceis'}
                </span>
              )}
            </div>
            <p className="tiny faint" style={{ marginBottom: 6 }}>
              Conferência de contraste (WCAG). As sugestões são opcionais: nenhuma cor sua é
              alterada sem você pedir.
            </p>
            {CONTRAST_PAIRS.map((pair) => (
              <ContrastRow
                key={`${pair.fg}-${pair.bg}`}
                palette={draft}
                pair={pair}
                onFix={(key, value) => setDraft((d) => ({ ...d, [key]: value }))}
              />
            ))}
          </div>

          <div className="stack">
            <button type="button" className="btn btn-primary btn-block" onClick={() => void saveCustom()}>
              <Icon name="check" size={17} />
              Salvar tema personalizado
            </button>
            <button type="button" className="btn btn-block" onClick={() => void resetCustom()}>
              Restaurar cores originais
            </button>
            <button
              type="button"
              className="btn btn-quiet btn-block"
              onClick={() => setEditorOpen(false)}
            >
              Cancelar alterações
            </button>
          </div>
        </div>
      </Sheet>
    </>
  );
}
