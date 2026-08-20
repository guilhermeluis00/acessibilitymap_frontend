import { useState } from 'react';
import { cadastrar, login } from '../api';
import { OPCOES_ROLE } from '../roles';

export default function Cadastro({ onLoginSuccess, onVoltarLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      await cadastrar(name, email, password, role);
      const { token, user } = await login(email, password);
      onLoginSuccess(token, user);
    } catch (error) {
      setErro(error.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1>Criar conta</h1>
        <label>
          Nome
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label>
          E-mail
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Senha
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        <label>
          Perfil
          <select value={role} onChange={(e) => setRole(e.target.value)} required>
            <option value="" disabled>
              Selecione um perfil
            </option>
            {OPCOES_ROLE.map((opcao) => (
              <option key={opcao.value} value={opcao.value}>
                {opcao.label}
              </option>
            ))}
          </select>
        </label>
        {erro && <p className="erro">{erro}</p>}
        <button type="submit" disabled={carregando}>
          {carregando ? 'Criando conta...' : 'Criar conta'}
        </button>
        <button type="button" className="link-button" onClick={onVoltarLogin}>
          Já tenho conta
        </button>
      </form>
    </div>
  );
}
