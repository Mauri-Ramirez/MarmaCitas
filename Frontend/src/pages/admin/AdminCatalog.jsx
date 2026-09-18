import { useState } from "react";

import AdminSpecialties from "./AdminSpecialties";
import AdminServices from "./AdminServices";

const catalogTabs = [
  { value: "specialties", label: "Especialidades" },
  { value: "services", label: "Servicios" },
];

function AdminCatalog() {
  const [activeTab, setActiveTab] = useState("specialties");

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <p className="text-sm font-medium text-primary">
          Catálogo de la clínica
        </p>

        <h1 className="mt-1 font-title text-3xl font-semibold text-slate-800">
          Catálogo
        </h1>

        <p className="mt-2 text-slate-500">
          Gestiona las especialidades y los servicios de la clínica.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Catálogo"
        className="mb-6 inline-flex w-full rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:w-auto"
      >
        {catalogTabs.map((tab) => {
          const isActive = activeTab === tab.value;

          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.value)}
              className={`flex-1 rounded-xl px-6 py-2.5 text-sm font-semibold transition sm:flex-none ${
                isActive
                  ? "bg-primary text-white shadow-sm"
                  : "text-slate-600 hover:bg-primaryLight/40 hover:text-primary"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "specialties" ? (
        <AdminSpecialties embedded />
      ) : (
        <AdminServices embedded />
      )}
    </div>
  );
}

export default AdminCatalog;