import { useCallback, useEffect, useMemo, useState } from 'react';
import { APIProvider, AdvancedMarker, InfoWindow, Map, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { buscarUsuario, cadastrarLocalAcessibilidade, listarLocaisAcessibilidade } from '../api';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const CENTRO_PADRAO = { lat: -3.71839, lng: -38.5434 };
const FORMULARIO_INICIAL = { name: '', description: '', accessibilityType: '' };
const MAPS_LIBRARIES = ['routes'];

function distanciaEmKm(origem, destino) {
  const radianos = (graus) => (graus * Math.PI) / 180;
  const deltaLatitude = radianos(destino.lat - origem.lat);
  const deltaLongitude = radianos(destino.lng - origem.lng);
  const latitudeOrigem = radianos(origem.lat);
  const latitudeDestino = radianos(destino.lat);
  const a = Math.sin(deltaLatitude / 2) ** 2
    + Math.cos(latitudeOrigem) * Math.cos(latitudeDestino) * Math.sin(deltaLongitude / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatarDistancia(distancia) {
  if (distancia < 1) return `${Math.round(distancia * 1000)} m`;
  return `${distancia.toFixed(1).replace('.', ',')} km`;
}

function normalizarTexto(valor = '') {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function RotaNoMapa({ origem, destino, solicitacao, onResultado, onErro }) {
  const map = useMap();
  const routesLibrary = useMapsLibrary('routes');

  useEffect(() => {
    if (!map || !routesLibrary || !origem || !destino || solicitacao === 0) return undefined;

    const service = new routesLibrary.DirectionsService();
    const renderer = new routesLibrary.DirectionsRenderer({ map, suppressMarkers: true });
    service.route({
      origin: origem,
      destination: destino,
      travelMode: routesLibrary.TravelMode.DRIVING,
    }, (resultado, status) => {
      if (status === 'OK' && resultado) {
        renderer.setDirections(resultado);
        const trecho = resultado.routes[0]?.legs[0];
        onResultado({ distancia: trecho?.distance?.text, duracao: trecho?.duration?.text });
      } else {
        onErro(`Não foi possível calcular a rota (${status}).`);
      }
    });

    return () => renderer.setMap(null);
  }, [map, routesLibrary, origem, destino, solicitacao, onResultado, onErro]);

  return null;
}

export default function MapaLocaisAcessiveis({ token, userId, isAdmin, refreshTrigger }) {
  const [locais, setLocais] = useState([]);
  const [localizacaoUsuario, setLocalizacaoUsuario] = useState(null);
  const [selecionado, setSelecionado] = useState(null);
  const [pontoNovo, setPontoNovo] = useState(null);
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [solicitacaoRota, setSolicitacaoRota] = useState(0);
  const [detalhesRota, setDetalhesRota] = useState(null);
  const [pesquisa, setPesquisa] = useState('');

  const carregarLocais = useCallback(() => listarLocaisAcessibilidade(token)
    .then(setLocais)
    .catch((error) => setErro(error.message)), [token]);

  useEffect(() => {
    carregarLocais();
  }, [carregarLocais]);

  useEffect(() => {
    buscarUsuario(userId)
      .then((usuario) => {
        if (usuario.localizationLatitude && usuario.localizationLongitude) {
          setLocalizacaoUsuario({
            lat: Number(usuario.localizationLatitude),
            lng: Number(usuario.localizationLongitude),
          });
        }
      })
      .catch((error) => setErro(error.message));
  }, [userId, refreshTrigger]);

  const destinoSelecionado = useMemo(() => selecionado ? {
    lat: Number(selecionado.latitude),
    lng: Number(selecionado.longitude),
  } : null, [selecionado]);

  const termoPesquisa = normalizarTexto(pesquisa.trim());
  const resultadosPesquisa = useMemo(() => {
    if (!termoPesquisa) return [];
    return locais.filter((local) => normalizarTexto([
      local.name,
      local.accessibilityType,
      local.description,
    ].filter(Boolean).join(' ')).includes(termoPesquisa));
  }, [locais, termoPesquisa]);

  const distanciaDireta = localizacaoUsuario && destinoSelecionado
    ? formatarDistancia(distanciaEmKm(localizacaoUsuario, destinoSelecionado))
    : null;

  const receberRota = useCallback((resultado) => {
    setDetalhesRota(resultado);
    setErro('');
  }, []);
  const receberErroRota = useCallback((mensagem) => setErro(mensagem), []);

  function selecionarLocal(local) {
    setSelecionado(local);
    setDetalhesRota(null);
    setSolicitacaoRota(0);
    setErro('');
  }

  function selecionarPonto(event) {
    if (!isAdmin || !event.detail.latLng) return;
    setSelecionado(null);
    setPontoNovo(event.detail.latLng);
  }

  function tracarRota() {
    if (!localizacaoUsuario) {
      setErro('Atualize ou permita sua localização antes de traçar a rota.');
      return;
    }
    setDetalhesRota(null);
    setErro('');
    setSolicitacaoRota((numero) => numero + 1);
  }

  async function cadastrar(event) {
    event.preventDefault();
    if (!pontoNovo) {
      setErro('Clique no mapa para indicar onde fica o local.');
      return;
    }
    setSalvando(true);
    setErro('');
    try {
      await cadastrarLocalAcessibilidade(token, {
        ...formulario,
        latitude: pontoNovo.lat,
        longitude: pontoNovo.lng,
      });
      setFormulario(FORMULARIO_INICIAL);
      setPontoNovo(null);
      await carregarLocais();
    } catch (error) {
      setErro(error.message);
    } finally {
      setSalvando(false);
    }
  }

  if (!GOOGLE_MAPS_API_KEY) return <p className="aviso">Configure VITE_GOOGLE_MAPS_API_KEY para exibir o mapa.</p>;

  return (
    <div className="locais-layout">
      {isAdmin ? (
        <form className="local-form" onSubmit={cadastrar}>
          <h2>Novo local acessível</h2>
          <p className="form-ajuda">Clique no mapa para posicionar o local.</p>
          <label>Nome<input required value={formulario.name} onChange={(e) => setFormulario({ ...formulario, name: e.target.value })} /></label>
          <label>Tipo de acessibilidade<input required placeholder="Ex.: rampa de acesso" value={formulario.accessibilityType} onChange={(e) => setFormulario({ ...formulario, accessibilityType: e.target.value })} /></label>
          <label>Descrição<textarea rows="4" value={formulario.description} onChange={(e) => setFormulario({ ...formulario, description: e.target.value })} /></label>
          <p className="coordenadas">{pontoNovo ? `${pontoNovo.lat.toFixed(6)}, ${pontoNovo.lng.toFixed(6)}` : 'Nenhum ponto selecionado'}</p>
          <button type="submit" disabled={salvando || !pontoNovo}>{salvando ? 'Cadastrando...' : 'Cadastrar local'}</button>
          {erro && <p className="erro">{erro}</p>}
        </form>
      ) : (
        <aside className="locais-sidebar">
          <h2>Locais acessíveis</h2>
          <label className="pesquisa-locais">
            <span>Pesquisar um local</span>
            <input
              type="search"
              value={pesquisa}
              onChange={(event) => setPesquisa(event.target.value)}
              placeholder="Nome, acessibilidade ou descrição"
              autoComplete="off"
            />
          </label>
          {!localizacaoUsuario && <p className="form-ajuda">Aguardando sua localização para calcular as distâncias.</p>}
          {locais.length === 0 && !erro && <p className="form-ajuda">Nenhum local cadastrado.</p>}
          {locais.length > 0 && !termoPesquisa && <p className="form-ajuda">Digite acima para encontrar um local. Todos continuam visíveis no mapa.</p>}
          {termoPesquisa && resultadosPesquisa.length === 0 && <p className="form-ajuda">Nenhum local encontrado para “{pesquisa.trim()}”.</p>}
          {resultadosPesquisa.length > 0 && <p className="resultado-contagem">{resultadosPesquisa.length} {resultadosPesquisa.length === 1 ? 'local encontrado' : 'locais encontrados'}</p>}
          <div className="locais-lista">
            {resultadosPesquisa.map((local) => {
              const ativo = selecionado?.id === local.id;
              const destino = { lat: Number(local.latitude), lng: Number(local.longitude) };
              const distancia = localizacaoUsuario ? formatarDistancia(distanciaEmKm(localizacaoUsuario, destino)) : null;
              return (
                <article key={local.id} className={`local-card ${ativo ? 'local-card--ativo' : ''}`}>
                  <button type="button" className="local-card-resumo" aria-expanded={ativo} onClick={() => selecionarLocal(local)}>
                    <strong>{local.name}</strong><span>{local.accessibilityType}</span>
                    {distancia && <small>A aproximadamente {distancia}</small>}
                  </button>
                  {ativo && (
                    <div className="local-card-detalhes">
                      <p>{local.description || 'Nenhuma descrição informada.'}</p>
                      {detalhesRota
                        ? <p><strong>Rota:</strong> {detalhesRota.distancia || distanciaDireta} · {detalhesRota.duracao}</p>
                        : distanciaDireta && <p><strong>Distância em linha reta:</strong> {distanciaDireta}</p>}
                      <button type="button" onClick={tracarRota}>Traçar rota até o local</button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          {erro && <p className="erro">{erro}</p>}
        </aside>
      )}

      <div className="mapa-container">
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={MAPS_LIBRARIES}>
          <Map style={{ width: '100%', height: '100%' }} defaultCenter={localizacaoUsuario || CENTRO_PADRAO} defaultZoom={12} mapId="locais-acessiveis" gestureHandling="greedy" onClick={selecionarPonto}>
            {locais.map((local) => <AdvancedMarker key={local.id} position={{ lat: Number(local.latitude), lng: Number(local.longitude) }} onClick={() => selecionarLocal(local)} />)}
            {localizacaoUsuario && <AdvancedMarker position={localizacaoUsuario} title="Sua localização"><Pin background="#2563eb" borderColor="#ffffff" glyphColor="#ffffff" /></AdvancedMarker>}
            {pontoNovo && <AdvancedMarker position={pontoNovo} title="Novo local" />}
            {selecionado && <InfoWindow position={destinoSelecionado} onCloseClick={() => setSelecionado(null)}><div className="usuario-card"><strong>{selecionado.name}</strong><span className="usuario-card-role">{selecionado.accessibilityType}</span>{distanciaDireta && <span>A aproximadamente {distanciaDireta}</span>}</div></InfoWindow>}
            <RotaNoMapa origem={localizacaoUsuario} destino={destinoSelecionado} solicitacao={solicitacaoRota} onResultado={receberRota} onErro={receberErroRota} />
          </Map>
        </APIProvider>
      </div>
    </div>
  );
}
