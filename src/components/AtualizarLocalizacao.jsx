import { useEffect, useState, useCallback } from 'react';
import { atualizarLocalizacao } from '../api';

export default function AtualizarLocalizacao({ token, onAtualizado }) {
  const [status, setStatus] = useState('idle'); // idle | buscando | ok | erro
  const [erro, setErro] = useState('');

  const atualizar = useCallback(() => {
    if (!navigator.geolocation) {
      setErro('Seu navegador não suporta geolocalização.');
      setStatus('erro');
      return;
    }

    setStatus('buscando');
    setErro('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          await atualizarLocalizacao(token, latitude, longitude);
          setStatus('ok');
          onAtualizado?.({ lat: latitude, lng: longitude });
        } catch (error) {
          setErro(error.message);
          setStatus('erro');
        }
      },
      (geoError) => {
        // Códigos: 1 = permissão negada, 2 = indisponível, 3 = timeout
        const mensagens = {
          1: 'Permissão de localização negada. Habilite nas configurações do navegador.',
          2: 'Não foi possível obter sua localização.',
          3: 'Tempo esgotado ao buscar localização.',
        };
        setErro(mensagens[geoError.code] || 'Erro ao obter localização.');
        setStatus('erro');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [token, onAtualizado]);

  // Atualiza automaticamente ao montar (ex: ao entrar no mapa)
  useEffect(() => {
    if (token) atualizar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="atualizar-localizacao">
      <button type="button" onClick={atualizar} disabled={status === 'buscando'}>
        {status === 'buscando' ? 'Buscando localização...' : 'Atualizar minha localização'}
      </button>
      {status === 'erro' && <p className="erro">{erro}</p>}
    </div>
  );
}