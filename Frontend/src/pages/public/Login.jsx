import { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";

import Button from "../../components/common/Button";
import { AuthContext } from "../../context/AuthContext";

function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    try {
      const user = await login(email, password);

      // Redirección según rol
      if (user.role === "patient") {
        navigate("/paciente");
      } else if (user.role === "doctor") {
        navigate("/odontologo");
      } else if (user.role === "receptionist") {
        navigate("/recepcion");
      } else if (user.role === "admin") {
        navigate("/admin");
      }
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Error en el inicio de sesión.",
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">

        <h2 className="text-2xl font-bold text-center text-primary mb-6">
          Iniciar sesión
        </h2>

        {error && (
          <p className="mb-4 text-red-600">{error}</p>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div>
            <label>Email</label>

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              className="w-full border px-4 py-2 rounded-lg"
            />
          </div>

          <div>
            <label>Contraseña</label>

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              className="w-full border px-4 py-2 rounded-lg"
            />
          </div>

          <Button type="submit">
            Ingresar
          </Button>
        </form>

        <p className="text-sm text-center mt-4">
          ¿No tienes cuenta?

          <Link
            to="/registro"
            className="text-primary font-semibold"
          >
            {" "}
            Regístrate
          </Link>
        </p>

      </div>
    </div>
  );
}

export default Login;