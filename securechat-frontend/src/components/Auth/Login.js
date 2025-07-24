import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../../utils/auth'; 
import '../css/Login.css'; 

const Login = () => {
  const navigate = useNavigate();
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [alert, setAlert] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('authToken')) {
      navigate('/chat');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
  e.preventDefault();
  setAlert('');
  setLoading(true);

  try {
    const data = await login({ identifier: loginInput, password });

    // ✅ Log the full response from the backend
    console.log("🔐 Login Response:", data);

    if (data.token) {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userEmail', data.email);
      localStorage.setItem('username', data.username);
      navigate('/chat');
    } else {
      setAlert(data.error || 'Login failed');
    }
  } catch (err) {
    console.error("❌ Login Error:", err);
    setAlert('Network error. Please try again.');
  } finally {
    setLoading(false);
  }
};


  return (
    <div class="page-wrapper">
        <div className="login-container">
      <div className="login-header">
        <h1><i className="fas fa-shield-alt"></i> SecureChat</h1>
        <p>Secure end-to-end encrypted messaging</p>
      </div>

      {alert && <div className="alert alert-danger">{alert}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <i className="fas fa-user"></i>
          <input
            type="text"
            className="form-control"
            placeholder="Username or Email"
            value={loginInput}
            onChange={e => setLoginInput(e.target.value)}
            required
          />
          <div className="login-hint">Enter your username or email address</div>
        </div>

        <div className="form-group">
          <i className="fas fa-lock"></i>
          <input
            type="password"
            className="form-control"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="btn-login" disabled={loading}>
          {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sign-in-alt"></i>} Login
        </button>
      </form>

      <div className="register-link">
        Don't have an account? <a href="/register">Register here</a>
      </div>
    </div>
    </div>
    
  );
};

export default Login;
