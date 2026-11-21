import { TopBar } from '@/components/ui';
import { Icon } from '@/components/Icon';

export function AboutScreen() {
  return (
    <>
      <TopBar title="Sobre" />
      <div className="page stack-lg" style={{ paddingTop: 6 }}>
        <header className="center" style={{ marginTop: 20 }}>
          <Icon name="box" size={28} style={{ color: 'var(--accent)' }} />
          <h1 className="serif" style={{ marginTop: 10 }}>
            Relicário
          </h1>
        </header>

        <section
          className="feature-card center"
          style={{ padding: '32px 24px', marginTop: 10 }}
        >
          <p
            className="serif"
            style={{
              fontSize: '1.15rem',
              lineHeight: 1.8,
              color: 'var(--ink)',
              whiteSpace: 'pre-line',
            }}
          >
            {'Para minha amiga Helô,\n\n'}
            {'Que este aplicativo sempre lembre você\ndo quanto é importante.\n\n'}
            {'De seu amigo,\nBiel.'}
          </p>
        </section>
      </div>
    </>
  );
}
