import Cookies from 'js-cookie';

const SESSION_COOKIE = 'session_id';
const API_URL = 'http://localhost:8000/api';

export interface User {
  id: string | number;  // Handle possible mismatches
  email: string;
  is_admin: boolean;
}

export interface AuthResponse {
  session_id: string;
  user: User;
}


export async function login(email: string, password: string): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to login');
    }

    const data: AuthResponse = await response.json();
    Cookies.set(SESSION_COOKIE, data.session_id, { expires: 7 });
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw new Error('Network error or invalid credentials');
  }
}

export async function signup(email: string, password: string): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to signup');
    }

    const data: AuthResponse = await response.json();
    Cookies.set(SESSION_COOKIE, data.session_id, { expires: 7 });
    return data;
  } catch (error) {
    console.error('Signup error:', error);
    throw new Error('Network error or invalid credentials');
  }
}

export async function logout(): Promise<void> {
  try {
    const sessionId = Cookies.get(SESSION_COOKIE);
    if (!sessionId) return;

    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${sessionId}` },
    });

    Cookies.remove(SESSION_COOKIE);
  } catch (error) {
    console.error('Logout failed:', error);
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const sessionId = Cookies.get(SESSION_COOKIE);
  if (!sessionId) return null;

  console.log('Current session ID:', sessionId); // Debugging log

  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${sessionId}` },
    });

    if (!response.ok) {
      Cookies.remove(SESSION_COOKIE);
      return null;
    }

    const data: User = await response.json();
    return data ?? null; // Ensure null fallback
  } catch (error) {
    console.error('Failed to fetch user:', error);
    Cookies.remove(SESSION_COOKIE);
    return null;
  }
}

export function getAuthHeader(): HeadersInit | undefined {
  const sessionId = Cookies.get(SESSION_COOKIE);
  return sessionId ? { 'Authorization': `Bearer ${sessionId}` } : undefined;
}
