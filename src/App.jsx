import { useCallback, useEffect, useState } from 'react';
import './App.css';
import Login from './components/Login';
import Cadastro from './components/Cadastro';
import MapaUsuarios from './components/MapaUsuarios';
import PerfilUsuario from './components/PerfilUsuario';
import MapaLocaisAcessiveis from './components/MapaLocaisAcessiveis';
import { atualizarLocalizacao } from './api';

function App() {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return token && user ? { token, user: JSON.parse(user) } : null;
  });
  const [tela, setTela] = useState('login');
  const [statusLocalizacao, setStatusLocalizacao] = useState('');
  const [atualizandoLocalizacao, setAtualizandoLocalizacao] = useState(false);
  const [refreshPerfil, setRefreshPerfil] = useState(0);
  const [isAdmin, setIsAdmin] = useState(() => Boolean(auth?.user.isAdmin));
  const [pagina, setPagina] = useState(() => (
    window.location.hash === '#locais-acessiveis' || (auth && !auth.user.isAdmin) ? 'locais' : 'inicio'
  ));

  function handleLoginSuccess(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setAuth({ token, user });
    setIsAdmin(Boolean(user.isAdmin));
    if (!user.isAdmin) {
      window.location.hash = 'locais-acessiveis';
      setPagina('locais');
    }
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuth(null);
    setStatusLocalizacao('');
    setIsAdmin(false);
  }

  function navegar(destino) {
    window.location.hash = destino === 'locais' ? 'locais-acessiveis' : '';
    setPagina(destino);
  }

  const capturarEAtualizarLocalizacao = useCallback(
    (token) => {
      if (!navigator.geolocation) {
        setStatusLocalizacao('Geolocalização não suportada neste navegador.');
        return;
      }

      setAtualizandoLocalizacao(true);
      setStatusLocalizacao('Obtendo localização do dispositivo...');

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          try {
            await atualizarLocalizacao(token, latitude, longitude);
            setStatusLocalizacao('Localização salva com sucesso.');
            setRefreshPerfil((n) => n + 1);
          } catch (error) {
            setStatusLocalizacao(`Erro ao salvar localização: ${error.message}`);
          } finally {
            setAtualizandoLocalizacao(false);
          }
        },
        (error) => {
          setStatusLocalizacao(`Não foi possível obter sua localização: ${error.message}`);
          setAtualizandoLocalizacao(false);
        }
      );
    },
    []
  );

  useEffect(() => {
    if (!auth) return;
    capturarEAtualizarLocalizacao(auth.token);
  }, [auth, capturarEAtualizarLocalizacao]);

  useEffect(() => {
    function sincronizarRota() {
      setPagina(window.location.hash === '#locais-acessiveis' ? 'locais' : 'inicio');
    }

    window.addEventListener('hashchange', sincronizarRota);
    return () => window.removeEventListener('hashchange', sincronizarRota);
  }, []);

  if (!auth) {
    if (tela === 'cadastro') {
      return (
        <Cadastro
          onLoginSuccess={handleLoginSuccess}
          onVoltarLogin={() => setTela('login')}
        />
      );
    }

    return <Login onLoginSuccess={handleLoginSuccess} onIrParaCadastro={() => setTela('cadastro')} />;
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>AcessibilityMap</h1>
        <nav className="app-nav" aria-label="Navegação principal">
          <button type="button" className={pagina === 'inicio' ? 'ativo' : ''} onClick={() => navegar('inicio')}>
            Início
          </button>
          <button type="button" className={pagina === 'locais' ? 'ativo' : ''} onClick={() => navegar('locais')}>
            Locais acessíveis
          </button>
        </nav>
        <div className="header-info">
          <span>{auth.user.name || auth.user.email}</span>
          <button type="button" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>
      {pagina === 'locais' ? (
        <main className="app-main">
          <MapaLocaisAcessiveis token={auth.token} userId={auth.user.id} isAdmin={isAdmin} refreshTrigger={refreshPerfil} />
        </main>
      ) : (
        <main className={`app-main ${isAdmin ? '' : 'app-main--sozinho'}`}>
          <PerfilUsuario
            userId={auth.user.id}
            statusLocalizacao={statusLocalizacao}
            atualizando={atualizandoLocalizacao}
            onAtualizarLocalizacao={() => capturarEAtualizarLocalizacao(auth.token)}
            refreshTrigger={refreshPerfil}
            onDadosCarregados={(dados) => setIsAdmin(Boolean(dados.isAdmin))}
          />
          {isAdmin && <MapaUsuarios token={auth.token} refreshTrigger={refreshPerfil} />}
        </main>
      )}
    </div>
  );
}

export default App;
