import { useEffect, useState } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import { listarUsuariosMapa } from '../api';
import { ROLES } from '../roles';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
// Fortaleza-CE
const CENTRO_PADRAO = { lat: -3.71839, lng: -38.5434 };

export default function MapaUsuarios({ token, refreshTrigger }) {
  const [usuarios, setUsuarios] = useState([]);
  const [erro, setErro] = useState('');
  const [selecionado, setSelecionado] = useState(null);

  useEffect(() => {
    listarUsuariosMapa(token)
      .then(setUsuarios)
      .catch((error) => setErro(error.message));
  }, [token, refreshTrigger]);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <p className="aviso">
        Configure VITE_GOOGLE_MAPS_API_KEY no arquivo .env do frontend para exibir o mapa.
      </p>
    );
  }

  return (
    <div className="mapa-container">
      {erro && <p className="erro">{erro}</p>}
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <Map
          style={{ width: '100%', height: '100%' }}
          defaultCenter={CENTRO_PADRAO}
          defaultZoom={12}
          mapId="acessibilitymap"
          gestureHandling="greedy"
        >
          {usuarios.map((usuario) => (
            <AdvancedMarker
              key={usuario.id}
              position={{
                lat: Number(usuario.localizationLatitude),
                lng: Number(usuario.localizationLongitude),
              }}
              onClick={() => setSelecionado(usuario)}
            />
          ))}

          {selecionado && (
            <InfoWindow
              position={{
                lat: Number(selecionado.localizationLatitude),
                lng: Number(selecionado.localizationLongitude),
              }}
              onCloseClick={() => setSelecionado(null)}
            >
              <div className="usuario-card">
                <strong>{selecionado.name || 'Usuário'}</strong>
                <span className="usuario-card-role">
                  {ROLES[selecionado.role] || selecionado.role}
                </span>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>
    </div>
  );
}
