import { useEffect, useState } from 'react';
import { buscarUsuario } from '../api';
import { ROLES } from '../roles';

export default function PerfilUsuario({ userId, statusLocalizacao, atualizando, onAtualizarLocalizacao, refreshTrigger, onDadosCarregados }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    buscarUsuario(userId)
      .then((resultado) => {
        setDados(resultado);
        onDadosCarregados?.(resultado);
      })
      .catch((error) => setErro(error.message));
  }, [userId, refreshTrigger]);

  return (
    <aside className="perfil-container">
      <h2>Meus dados</h2>

      {erro && <p className="erro">{erro}</p>}

      {dados && (
        <dl className="perfil-lista">
          <dt>Nome</dt>
          <dd>{dados.name || '—'}</dd>

          <dt>E-mail</dt>
          <dd>{dados.email}</dd>

          <dt>Perfil</dt>
          <dd>{ROLES[dados.role] || dados.role}</dd>

          <dt>Administrador</dt>
          <dd>{dados.isAdmin ? 'Sim' : 'Não'}</dd>

          <dt>Visível no mapa</dt>
          <dd>{dados.visualization ? 'Sim' : 'Não'}</dd>

          <dt>Latitude</dt>
          <dd>{dados.localizationLatitude || 'Ainda não informada'}</dd>

          <dt>Longitude</dt>
          <dd>{dados.localizationLongitude || 'Ainda não informada'}</dd>
        </dl>
      )}

      <button type="button" onClick={onAtualizarLocalizacao} disabled={atualizando}>
        {atualizando ? 'Obtendo localização...' : 'Atualizar minha localização'}
      </button>

      {statusLocalizacao && <p className="status-localizacao">{statusLocalizacao}</p>}
    </aside>
  );
}
