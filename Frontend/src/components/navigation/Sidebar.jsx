import { useContext } from "react";
import { Link } from "react-router-dom";

import { AuthContext } from "../../context/AuthContext";
import { navigationItems } from "../../config/navigationItems";

function Sidebar() {
  const { user, logout } = useContext(AuthContext);

  const items = navigationItems[user?.role] || [];

  return (
    <aside className="w-64 min-h-screen bg-blue-700 text-white p-5">
      <h2 className="text-xl font-bold mb-6">
        MarmaCitas
      </h2>

      <ul className="space-y-4">
        {items.map((item) => (
          <li key={item.path}>
            <Link
              to={item.path}
              className="block hover:text-blue-200 transition"
            >
              {item.label}
            </Link>
          </li>
        ))}

        <li>
          <button
            type="button"
            onClick={logout}
            className="cursor-pointer text-red-300 hover:text-red-200 transition"
          >
            Cerrar sesión
          </button>
        </li>
      </ul>
    </aside>
  );
}

export default Sidebar;