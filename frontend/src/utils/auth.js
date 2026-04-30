const TOKEN_KEY = 'kf_admin_token';

// Fake credential — update as needed
const VALID_USER = 'admin';
const VALID_PASS = 'admin';

export function login(username, password) {
  if (username === VALID_USER && password === VALID_PASS) {
    localStorage.setItem(TOKEN_KEY, 'fake-admin-token-kf');
    return true;
  }
  return false;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated() {
  return !!localStorage.getItem(TOKEN_KEY);
}
