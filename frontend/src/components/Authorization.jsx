import { useState } from 'react';

function Authorization() {
  const [credentials, setCredentials] = useState({
    api_base_url: '',
    user_email: '',
    user_pass: ''
  });

  const [token, setToken] = useState(localStorage.getItem('mastodon_token') || '');
  const [hasChecked, setHasChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCrawler, setSelectedCrawler] = useState('mastodon');
  const [crawlerStatus, setCrawlerStatus] = useState({
    mastodon: { status: 'unknown', message: 'Not checked' },
    twitter: { status: 'unknown', message: 'Not checked' },
    facebook: { status: 'unknown', message: 'Not checked' }
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const checkToken = async () => {
    if (!token) {
      setHasChecked(true);
      setCrawlerStatus(prev => ({
        ...prev,
        mastodon: { status: 'error', message: 'No token found' }
      }));
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`http://localhost:8000/auth/mastodon/check?token=${token}`);
      if (response.ok) {
        setHasChecked(false);
        setCrawlerStatus(prev => ({
          ...prev,
          mastodon: { status: 'success', message: 'Authorized' }
        }));
      } else {
        localStorage.removeItem('mastodon_token');
        setToken('');
        setHasChecked(true);
        setCrawlerStatus(prev => ({
          ...prev,
          mastodon: { status: 'error', message: 'Token invalid' }
        }));
      }
    } catch (err) {
      setError('Failed to check token status');
      setHasChecked(true);
      setCrawlerStatus(prev => ({
        ...prev,
        mastodon: { status: 'error', message: 'Check failed' }
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8000/auth/mastodon/authorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      const data = await response.json();
      setToken(data.token);
      localStorage.setItem('mastodon_token', data.token);
      setHasChecked(false);
      setCrawlerStatus(prev => ({
        ...prev,
        mastodon: { status: 'success', message: 'Authorized' }
      }));
    } catch (err) {
      setError(err.message || 'Failed to authenticate');
      setCrawlerStatus(prev => ({
        ...prev,
        mastodon: { status: 'error', message: 'Authentication failed' }
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return '#28a745';
      case 'error':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  return (
    <div className="authorization-container">
      <h2>Authorization</h2>
      
      <div className="status-table">
        <h3>Authorization Status</h3>
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Mastodon</th>
              <th>Twitter</th>
              <th>Facebook</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Status</td>
              <td>
                <span 
                  className="status-indicator"
                  style={{ backgroundColor: getStatusColor(crawlerStatus.mastodon.status) }}
                />
                {crawlerStatus.mastodon.message}
              </td>
              <td>
                <span 
                  className="status-indicator"
                  style={{ backgroundColor: getStatusColor(crawlerStatus.twitter.status) }}
                />
                {crawlerStatus.twitter.message}
              </td>
              <td>
                <span 
                  className="status-indicator"
                  style={{ backgroundColor: getStatusColor(crawlerStatus.facebook.status) }}
                />
                {crawlerStatus.facebook.message}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="crawler-selector">
        <label htmlFor="crawler-select">Select Crawler:</label>
        <select 
          id="crawler-select"
          value={selectedCrawler}
          onChange={(e) => setSelectedCrawler(e.target.value)}
          className="crawler-select"
        >
          <option value="mastodon">Mastodon</option>
          <option value="twitter" disabled>Twitter (Coming Soon)</option>
          <option value="facebook" disabled>Facebook (Coming Soon)</option>
        </select>
      </div>

      {!hasChecked ? (
        <div className="token-check">
          <button 
            onClick={checkToken} 
            className="check-token-button"
            disabled={isLoading}
          >
            {isLoading ? 'Checking...' : 'Check Mastodon Token'}
          </button>
        </div>
      ) : (
        <div className="credentials-section">
          <div className="message">
            <p>No valid Mastodon token found. Please enter your credentials below:</p>
          </div>

          <form onSubmit={handleSubmit} className="credentials-form">
            <div className="form-group">
              <label htmlFor="api_base_url">Mastodon Instance URL:</label>
              <input
                type="text"
                id="api_base_url"
                name="api_base_url"
                value={credentials.api_base_url}
                onChange={handleInputChange}
                placeholder="https://mastodon.social"
                required
              />
              <small className="help-text">Enter your Mastodon instance URL (e.g., https://mastodon.social)</small>
            </div>

            <div className="form-group">
              <label htmlFor="user_email">Email:</label>
              <input
                type="email"
                id="user_email"
                name="user_email"
                value={credentials.user_email}
                onChange={handleInputChange}
                placeholder="your.email@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="user_pass">Password:</label>
              <input
                type="password"
                id="user_pass"
                name="user_pass"
                value={credentials.user_pass}
                onChange={handleInputChange}
                placeholder="••••••••"
                required
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="form-actions">
              <button 
                type="submit" 
                className="save-button"
                disabled={isLoading}
              >
                {isLoading ? 'Authenticating...' : 'Save Credentials'}
              </button>
            </div>
          </form>

          <div className="documentation-link">
            <p>
              Need help? Check out the{' '}
              <a 
                href="https://docs.joinmastodon.org/api/" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                official Mastodon API documentation
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Authorization; 