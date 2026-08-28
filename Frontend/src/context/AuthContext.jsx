import { createContext, useEffect, useState } from "react";

import { loginRequest } from "../services/authService";
import { getMyProfile } from "../services/userService";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * =====================================================
   * Restaurar sesión
   * =====================================================
   *
   * Si existe un token, consultamos al backend para
   * obtener el usuario autenticado.
   */
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await getMyProfile();

        setUser(response.user);
      } catch (error) {
        console.error("Error al restaurar sesión:", error);

        localStorage.removeItem("token");
        localStorage.removeItem("user");

        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  /**
   * =====================================================
   * Login
   * =====================================================
   */
  const login = async (email, password) => {
    const data = await loginRequest({
      email,
      password,
    });

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    setUser(data.user);

    return data.user;
  };

  /**
   * =====================================================
   * Logout
   * =====================================================
   */
  const logout = () => {
    setUser(null);

    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}