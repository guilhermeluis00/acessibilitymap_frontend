const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:61203';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || 'Erro ao comunicar com o servidor.');
  }

  return data;
}

export function login(email, password) {
  return request('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function cadastrar(name, email, password, role) {
  return request('/cadastro', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, role }),
  });
}

export function atualizarLocalizacao(token, latitude, longitude) {
  return request('/localizacao', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ latitude, longitude }),
  });
}

export function listarUsuariosMapa(token) {
  return request('/usuarios/mapa', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function buscarUsuario(id) {
  return request(`/dados/${id}`);
}

export function listarLocaisAcessibilidade(token) {
  return request('/locais-acessibilidade', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function cadastrarLocalAcessibilidade(token, local) {
  return request('/locais-acessibilidade', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(local),
  });
}
