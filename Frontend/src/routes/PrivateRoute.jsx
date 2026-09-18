import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const roleHome = {
  patient: "/paciente",
  doctor: "/odontologo",
  receptionist: "/recepcion",
  admin: "/admin",
};

function PrivateRoute({ children, allowedRoles }) {
  const { user, loading } = useContext(AuthContext);

  // Esperar a que termine de cargar la sesión
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="border rounded-lg p-6 bg-white">
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  // No logueado
  if (!user) {
    return <Navigate to="/login" />;
  }

  // Rol no permitido: enviar al inicio del propio rol
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={roleHome[user.role] || "/"} />;
  }

  // Acceso permitido
  return children;
}

export default PrivateRoute;