import React, { useState } from 'react';
import '../css/Signup.css';
import { signup } from '../../utils/auth';

const Signup = () => {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [alert, setAlert] = useState({ message: '', type: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usernameHint, setUsernameHint] = useState({
    message: '3-20 characters, letters, numbers, and underscores only',
    valid: null,
  });

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setForm(prev => ({ ...prev, [id]: value }));

    if (id === 'username') {
      const isValid = /^[a-zA-Z0-9_]{3,20}$/.test(value);
      if (value === '') {
        setUsernameHint({
          message: '3-20 characters, letters, numbers, and underscores only',
          valid: null,
        });
      } else if (isValid) {
        setUsernameHint({ message: 'Username looks good!', valid: true });
      } else {
        setUsernameHint({ message: 'Invalid username format', valid: false });
      }
    }
  };

  const showAlert = (message, type = 'danger') => {
    setAlert({ message, type });
    setTimeout(() => setAlert({ message: '', type: '' }), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { username, email, password, confirmPassword } = form;

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      showAlert('Username must be 3-20 characters and contain only letters, numbers, and underscores');
      return;
    }

    if (password !== confirmPassword) {
      showAlert('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      showAlert('Password must be at least 6 characters long');
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await signup({ username, email, password });

      if (data && data.success) {
        showAlert('Registration successful! Redirecting...', 'success');
        setTimeout(() => window.location.href = '/', 2000);
      } else {
        showAlert(data.error || 'Registration failed');
      }
    } catch (error) {
      showAlert('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div class="page-wrapper">
       <div className="register-container">
      <div className="register-header">
        <h1><i className="fas fa-user-plus"></i> Register</h1>
        <p>Create your secure account</p>
      </div>

      {alert.message && (
        <div className={`alert alert-${alert.type}`}>
          {alert.message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <i className="fas fa-user"></i>
          <input
            type="text"
            className="form-control"
            id="username"
            placeholder="Username"
            required
            value={form.username}
            onChange={handleInputChange}
          />
          <div
            className={`field-hint ${
              usernameHint.valid === true
                ? 'username-valid'
                : usernameHint.valid === false
                ? 'username-invalid'
                : ''
            }`}
          >
            {usernameHint.message}
          </div>
        </div>

        <div className="form-group">
          <i className="fas fa-envelope"></i>
          <input
            type="email"
            className="form-control"
            id="email"
            placeholder="Email Address"
            required
            value={form.email}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-group">
          <i className="fas fa-lock"></i>
          <input
            type="password"
            className="form-control"
            id="password"
            placeholder="Password"
            required
            value={form.password}
            onChange={handleInputChange}
          />
          <div className="field-hint">Minimum 6 characters</div>
        </div>

        <div className="form-group">
          <i className="fas fa-lock"></i>
          <input
            type="password"
            className="form-control"
            id="confirmPassword"
            placeholder="Confirm Password"
            required
            value={form.confirmPassword}
            onChange={handleInputChange}
          />
        </div>

        <button
          type="submit"
          className="btn-register"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <><i className="fas fa-spinner fa-spin"></i> Registering...</>
          ) : (
            <><i className="fas fa-user-plus"></i> Register</>
          )}
        </button>
      </form>

      <div className="login-link">
        Already have an account? <a href="/">Login here</a>
      </div>
    </div>
    </div>
   
  );
};

export default Signup;
