import { useState } from "react";

import Sidebar from "../components/navigation/Sidebar";

function DashboardLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="flex min-h-screen bg-gray-100">
      {menuOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={closeMenu}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}

      <Sidebar open={menuOpen} onClose={closeMenu} />

      <main className="flex-1 p-4 md:p-8">
        <div className="mb-4 flex items-center justify-between md:hidden">
          <button
            type="button"
            aria-label="Abrir menú"
            onClick={() => setMenuOpen(true)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="h-5 w-5"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <span className="font-semibold text-gray-700">
            MarmaCitas
          </span>
        </div>

        {children}
      </main>
    </div>
  );
}

export default DashboardLayout;