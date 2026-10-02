import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: '',
    password: '',
    passwordConfirmation: '',
    displayName: '',
    riotId: '',
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.passwordConfirmation) {
      setError('As senhas não conferem.');
      return;
    }
    setLoading(true);
    setError(null);
    const [riotGameName, riotTagLine] = form.riotId.split('#');
    try {
      await register({
        username: form.username,
        password: form.password,
        passwordConfirmation: form.passwordConfirmation,
        displayName: form.displayName,
        riotGameName,
        riotTagLine,
      });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Não foi possível criar a conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lol-auth-page">
      <div className="lol-auth">
        <h1>Criar conta</h1>
        <form onSubmit={handleSubmit} className="lol-auth-form">
          <input
            type="text"
            placeholder="Usuário"
            value={form.username}
            onChange={update('username')}
            required
          />
          <input
            type="password"
            placeholder="Senha"
            value={form.password}
            onChange={update('password')}
            minLength={8}
            required
          />
          <input
            type="password"
            placeholder="Confirmar senha"
            value={form.passwordConfirmation}
            onChange={update('passwordConfirmation')}
            minLength={8}
            required
          />
          <p className="lol-auth-hint">
            A senha precisa ter 8+ caracteres, com maiúscula, minúscula, número e símbolo.
          </p>
          <input
            type="text"
            placeholder="Apelido no grupo"
            value={form.displayName}
            onChange={update('displayName')}
            required
          />
          <input
            type="text"
            placeholder="Riot ID (ex: Faker#KR1)"
            value={form.riotId}
            onChange={update('riotId')}
            pattern=".+#.+"
            title="Formato: nomeDeJogo#tag"
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Criando...' : 'Criar conta'}
          </button>
        </form>
        {error && <p className="lol-form-error">{error}</p>}
        <p className="lol-auth-switch">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
