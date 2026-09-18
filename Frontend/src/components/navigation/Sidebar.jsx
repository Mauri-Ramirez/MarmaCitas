import { useContext } from "react";
import { Link, useLocation } from "react-router-dom";

import { AuthContext } from "../../context/AuthContext";
import { navigationItems } from "../../config/navigationItems";

const roleLabels = {
  patient: "Paciente",
  doctor: "Odontólogo",
  receptionist: "Recepción",
  admin: "Administrador",
};

function Sidebar({ open = false, onClose }) {
  const { user, logout } = useContext(AuthContext);

  const location = useLocation();

  const items = navigationItems[user?.role] || [];

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-blue-700 text-white p-5 transform transition-transform duration-200 md:static md:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <h2 className="text-xl font-bold">
        MarmaCitas
      </h2>

      {user && (
        <div className="mt-4 border-t border-blue-600 pt-4">
          <p className="font-semibold">{user.name}</p>

          <p className="text-sm text-blue-200">
            {roleLabels[user.role] ?? user.role}
          </p>
        </div>
      )}

      <nav className="mt-6 flex-1">
        <ul className="space-y-1">
          {items.map((item) => {
            const isActive = location.pathname === item.path;

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={onClose}
                  className={`block rounded-lg px-3 py-2 transition ${
                    isActive
                      ? "bg-primary text-white font-semibold"
                      : "hover:text-blue-200"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-6 border-t border-blue-600 pt-4">
        <button
          type="button"
          onClick={logout}
          className="w-full cursor-pointer rounded-lg px-3 py-2 text-left text-red-300 transition hover:bg-blue-800 hover:text-red-200"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;