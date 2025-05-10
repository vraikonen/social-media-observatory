import { useState, useEffect } from 'react';

function Authorization() {
  const [credentials, setCredentials] = useState({
    client_id: '',
    client_secret: '',
    redirect_uri: '',
    instance_domain: ''
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

  // Check for OAuth callback
  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      
      if (code && state) {
        // Verify state to prevent CSRF
        const storedState = sessionStorage.getItem('mastodon_oauth_state');
        if (state !== storedState) {
          setError('Invalid state parameter. Possible CSRF attack.');
          setCrawlerStatus(prev => ({
            ...prev,
            mastodon: { status: 'error', message: 'Authentication failed' }
          }));
          return;
        }

        // Get stored credentials
        const storedCredentials = sessionStorage.getItem('mastodon_oauth_credentials');
        if (!storedCredentials) {
          setError('No stored credentials found. Please try authorizing again.');
          return;
        }

        const credentials = JSON.parse(storedCredentials);
        
        try {
          const response = await fetch('http://localhost:8000/auth/mastodon/callback', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code,
              state,
              credentials
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to exchange code for token');
          }

          const data = await response.json();
          // Store token and clear credentials
          sessionStorage.setItem('mastodon_token', data.token);
          sessionStorage.removeItem('mastodon_oauth_credentials');
          setToken(data.token);
          setError(null);
          setHasChecked(false);
          setCrawlerStatus(prev => ({
            ...prev,
            mastodon: { status: 'success', message: 'Authorized' }
          }));
          
          // Clean up URL and session storage
          window.history.replaceState({}, document.title, window.location.pathname);
          sessionStorage.removeItem('mastodon_oauth_state');
        } catch (err) {
          setError(err.message);
          setCrawlerStatus(prev => ({
            ...prev,
            mastodon: { status: 'error', message: 'Authentication failed' }
          }));
        } finally {
          setIsLoading(false);
        }
      }
    };

    handleCallback();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const checkToken = async () => {
    const token = sessionStorage.getItem('mastodon_token');
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
        sessionStorage.removeItem('mastodon_token');
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

  const handleOAuthSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Generate a random state string for CSRF protection
      const state = Math.random().toString(36).substring(2);
      
      // Store credentials and state in session storage
      sessionStorage.setItem('mastodon_oauth_credentials', JSON.stringify(credentials));
      sessionStorage.setItem('mastodon_oauth_state', state);
      
      // Redirect to Mastodon OAuth page
      const authUrl = `https://${credentials.instance_domain}/oauth/authorize?` + 
        `client_id=${encodeURIComponent(credentials.client_id)}&` +
        `redirect_uri=${encodeURIComponent(credentials.redirect_uri)}&` +
        'response_type=code&' +
        'scope=read&' +
        `state=${encodeURIComponent(state)}`;
      
      window.location.href = authUrl;
    } catch (err) {
      setError(err.message || 'Failed to start authentication');
      setCrawlerStatus(prev => ({
        ...prev,
        mastodon: { status: 'error', message: 'Authentication failed' }
      }));
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
      <div className="status-table">
        <h2>Authorization Status</h2>
        <table>
          <thead>
            <tr>
              <th>Crawler</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(crawlerStatus).map(([crawler, { status, message }]) => (
              <tr key={crawler}>
                <td>{crawler}</td>
                <td style={{ color: getStatusColor(status) }}>
                  {message}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
            <p>No valid Mastodon token found. Please enter your OAuth credentials below:</p>
          </div>

          <form onSubmit={handleOAuthSubmit} className="credentials-form">
            <div className="form-group">
              <label htmlFor="instance_domain">Instance Domain:</label>
              <input
                type="text"
                id="instance_domain"
                name="instance_domain"
                value={credentials.instance_domain}
                onChange={handleInputChange}
                placeholder="mastodon.social"
                required
              />
              <small className="help-text">Enter your Mastodon instance domain (e.g., mastodon.social)</small>
            </div>

            <div className="form-group">
              <label htmlFor="client_id">Client ID:</label>
              <input
                type="text"
                id="client_id"
                name="client_id"
                value={credentials.client_id}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="client_secret">Client Secret:</label>
              <input
                type="password"
                id="client_secret"
                name="client_secret"
                value={credentials.client_secret}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="redirect_uri">Redirect URI:</label>
              <input
                type="text"
                id="redirect_uri"
                name="redirect_uri"
                value={credentials.redirect_uri}
                onChange={handleInputChange}
                placeholder="http://localhost:3000/callback"
                required
              />
              <small className="help-text">The URI where Mastodon will redirect after authentication</small>
            </div>

            <button type="submit" className="submit-button" disabled={isLoading}>
              {isLoading ? 'Authorizing...' : 'Authorize with Mastodon'}
            </button>
          </form>

          {error && <div className="error-message">{error}</div>}
        </div>
      )}
    </div>
  );
}

export default Authorization; 