import { Link } from 'react-router-dom';
import { useArchive } from '@/state/ArchiveContext';
import { Icon } from '@/components/Icon';

export function MoreScreen() {
  const { collections, capsules, trash, memories, settings } = useArchive();
  const hardDays = memories.filter((m) => m.hardDay).length;

  const rows = [
    {
      to: '/colecoes',
      icon: 'book',
      title: 'Coleções',
      detail:
        collections.length === 0
          ? 'Reúna memórias por um significado seu'
          : `${collections.length} ${collections.length === 1 ? 'coleção' : 'coleções'}`,
    },
    {
      to: '/abrigo',
      icon: 'shelter',
      title: 'Para os dias difíceis',
      detail:
        hardDays === 0
          ? 'Nenhuma memória marcada ainda'
          : `${hardDays} ${hardDays === 1 ? 'memória guardada' : 'memórias guardadas'}`,
    },
    {
      to: '/capsulas',
      icon: 'capsule',
      title: 'Cartas para o futuro',
      detail:
        capsules.length === 0
          ? 'Cápsulas para abrir mais adiante'
          : `${capsules.length} ${capsules.length === 1 ? 'cápsula' : 'cápsulas'}`,
    },
    {
      to: '/estatisticas',
      icon: 'chart',
      title: 'Estatísticas',
      detail: 'Uma visão do que o arquivo já guarda',
    },
    {
      to: '/hoje-no-passado',
      icon: 'clock',
      title: 'Hoje, no passado',
      detail: 'Registros desta data em anos anteriores',
    },
    {
      to: '/surpreenda',
      icon: 'shuffle',
      title: 'Surpreenda-me',
      detail: 'Abrir um registro aleatório do arquivo',
    },
    {
      to: '/lixeira',
      icon: 'trash',
      title: 'Lixeira',
      detail:
        trash.length === 0
          ? 'Vazia'
          : `${trash.length} ${trash.length === 1 ? 'registro recuperável' : 'registros recuperáveis'} por ${settings.trashRetentionDays} dias`,
    },
    {
      to: '/configuracoes',
      icon: 'settings',
      title: 'Configurações',
      detail: 'Aparência, privacidade, backup e arquivo',
    },
  ];

  return (
    <>
      <div className="page-head">
        <div className="eyebrow">Relicário</div>
        <h1 className="serif">Mais</h1>
      </div>

      <div className="page">
        <div className="card card-pad list-divided">
          {rows.map((row) => (
            <Link key={row.to} to={row.to} className="link-row">
              <Icon name={row.icon} />
              <span className="label">
                <strong>{row.title}</strong>
                <span>{row.detail}</span>
              </span>
              <Icon name="forward" />
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
