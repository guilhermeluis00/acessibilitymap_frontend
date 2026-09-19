import { useEffect, useState, useCallback } from 'react';
import { listarAvaliacoes, criarAvaliacao, editarAvaliacao, removerAvaliacao } from '../api';

function Estrelas({ valor, tamanho = 18, interativo = false, onChange }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="estrelas" role={interativo ? 'radiogroup' : undefined} aria-label="Avaliação em estrelas">
      {[1, 2, 3, 4, 5].map((n) => {
        const preenchida = interativo ? n <= (hover || valor) : n <= Math.round(valor);
        return (
          <span
            key={n}
            onClick={interativo ? () => onChange(n) : undefined}
            onMouseEnter={interativo ? () => setHover(n) : undefined}
            onMouseLeave={interativo ? () => setHover(0) : undefined}
            style={{
              cursor: interativo ? 'pointer' : 'default',
              fontSize: tamanho,
              color: preenchida ? '#f5a623' : '#d1d5db',
              lineHeight: 1,
            }}
            aria-label={interativo ? `${n} estrela${n > 1 ? 's' : ''}` : undefined}
          >
            ★
          </span>
        );
      })}
    </div>
  );
}

// Formulário reutilizado tanto para criar quanto para editar
function FormularioAvaliacao({ notaInicial = 0, comentarioInicial = '', enviando, textoBotao, onEnviar, onCancelar }) {
  const [nota, setNota] = useState(notaInicial);
  const [comentario, setComentario] = useState(comentarioInicial);

  function submeter(event) {
    event.preventDefault();
    onEnviar({ nota, comentario });
  }

  return (
    <form className="avaliacao-form" onSubmit={submeter}>
      <Estrelas valor={nota} interativo onChange={setNota} tamanho={22} />
      <textarea
        rows="2"
        placeholder="Deixe um comentário (opcional)"
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        maxLength={1000}
      />
      <div className="avaliacao-form-botoes">
        <button type="submit" disabled={enviando}>
          {enviando ? 'Enviando...' : textoBotao}
        </button>
        {onCancelar && (
          <button type="button" className="avaliacao-cancelar" onClick={onCancelar}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

export default function Avaliacoes({ token, userId, localId, mediaAvaliacoes, totalAvaliacoes }) {
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [editandoId, setEditandoId] = useState(null);

  const carregar = useCallback(() => {
    setCarregando(true);
    listarAvaliacoes(localId)
      .then(setAvaliacoes)
      .catch((error) => setErro(error.message))
      .finally(() => setCarregando(false));
  }, [localId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // avaliações são públicas: qualquer visitante vê a lista, mesmo sem login
  const estaLogado = Boolean(token && userId);
  const minhaAvaliacao = estaLogado ? avaliacoes.find((a) => a.userId === userId) : null;

  // Calcula média e total a partir da lista já carregada, em vez de confiar
  // apenas nas props (que podem estar desatualizadas caso o local não seja
  // recarregado após uma nova avaliação). Usa as props só como valor inicial
  // enquanto a lista ainda não carregou.
  const totalCalculado = avaliacoes.length;
  const mediaCalculada = totalCalculado > 0
    ? avaliacoes.reduce((soma, a) => soma + a.nota, 0) / totalCalculado
    : 0;

  const mediaExibida = carregando ? (mediaAvaliacoes || 0) : mediaCalculada;
  const totalExibido = carregando ? (totalAvaliacoes || 0) : totalCalculado;

  async function enviarAvaliacao({ nota, comentario }) {
    if (nota < 1) {
      setErro('Escolha ao menos 1 estrela.');
      return;
    }
    setEnviando(true);
    setErro('');
    try {
      await criarAvaliacao(token, localId, { nota, comentario });
      await carregar();
    } catch (error) {
      setErro(error.message);
    } finally {
      setEnviando(false);
    }
  }

  async function salvarEdicao({ nota, comentario }) {
    if (nota < 1) {
      setErro('Escolha ao menos 1 estrela.');
      return;
    }
    setEnviando(true);
    setErro('');
    try {
      await editarAvaliacao(token, editandoId, { nota, comentario });
      setEditandoId(null);
      await carregar();
    } catch (error) {
      setErro(error.message);
    } finally {
      setEnviando(false);
    }
  }

  async function excluir(avaliacaoId) {
    try {
      await removerAvaliacao(token, avaliacaoId);
      await carregar();
    } catch (error) {
      setErro(error.message);
    }
  }

  return (
    <div className="avaliacoes">
      <div className="avaliacoes-resumo">
        <Estrelas valor={mediaExibida} />
        <span className="avaliacoes-media-texto">
          {mediaExibida ? mediaExibida.toFixed(1) : 'Sem avaliações'}
          {totalExibido > 0 && ` (${totalExibido})`}
        </span>
      </div>

      {estaLogado && !minhaAvaliacao && (
        <FormularioAvaliacao
          enviando={enviando}
          textoBotao="Enviar avaliação"
          onEnviar={enviarAvaliacao}
        />
      )}
      {!estaLogado && (
        <p className="form-ajuda">Faça login para avaliar este local.</p>
      )}

      {erro && <p className="erro">{erro}</p>}

      <div className="avaliacoes-lista">
        {carregando && <p className="form-ajuda">Carregando avaliações...</p>}
        {!carregando && avaliacoes.length === 0 && (
          <p className="form-ajuda">Nenhuma avaliação ainda. Seja o primeiro!</p>
        )}
        {avaliacoes.map((a) => {
          const ehMinha = estaLogado && a.userId === userId;
          const estaEditando = editandoId === a.id;

          if (estaEditando) {
            return (
              <div key={a.id} className="avaliacao-item">
                <FormularioAvaliacao
                  notaInicial={a.nota}
                  comentarioInicial={a.comentario || ''}
                  enviando={enviando}
                  textoBotao="Salvar alterações"
                  onEnviar={salvarEdicao}
                  onCancelar={() => setEditandoId(null)}
                />
              </div>
            );
          }

          return (
            <div key={a.id} className="avaliacao-item">
              <div className="avaliacao-item-topo">
                <strong>{a.usuario?.name || 'Usuário'}</strong>
                <Estrelas valor={a.nota} tamanho={14} />
              </div>
              {a.comentario && <p>{a.comentario}</p>}
              {ehMinha && (
                <div className="avaliacao-item-acoes">
                  <button type="button" onClick={() => setEditandoId(a.id)}>
                    Editar
                  </button>
                  <button type="button" className="avaliacao-excluir" onClick={() => excluir(a.id)}>
                    Excluir
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}