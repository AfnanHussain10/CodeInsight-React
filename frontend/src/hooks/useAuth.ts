import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext.tsx';
import { login as authLogin, signup as authSignup, logout as authLogout } from '../lib/auth.ts';

export function useAuth() {
  const { user, loading, setUser } = useAuthContext();
  const navigate = useNavigate();

  const login = async (email: string, password: string) => {
    const { user: newUser } = await authLogin(email, password);
    setUser(newUser);
    
    if (newUser.is_admin) {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  const signup = async (email: string, password: string) => {
    const { user: newUser } = await authSignup(email, password);
    setUser(newUser);
    navigate('/dashboard');
  };

  const logout = async () => {
    await authLogout();
    setUser(null);
    navigate('/login');
  };

  return {
    user,
    loading,
    login,
    signup,
    logout,
  };
}