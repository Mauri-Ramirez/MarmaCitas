import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";

import Button from "../../components/common/Button";
import { AuthContext } from "../../context/AuthContext";

import { loginRequest } from "../../services/authService";


function Login(){

const { login } = useContext(AuthContext);
const navigate = useNavigate();

const [email, setEmail] = useState("");
const [password, setPassword] = useState("");


const handleSubmit = async (e) => {
  e.preventDefault();

  try {

    const data = await loginRequest({
      email,
      password
    });

    // Guardar usuario en contexto
    login(data.user);

    // Guardar token
    localStorage.setItem("token", data.token);

    // Redirección por rol
    if(data.user.role === "patient"){
      navigate("/paciente");
    }
    else if(data.user.role === "doctor"){
      navigate("/odontologo");
    }
    else if(data.user.role === "receptionist"){
      navigate("/recepcion");
    }
    else if(data.user.role === "admin"){
      navigate("/admin");
    }

  } catch (error) {
    alert(error.response?.data?.message || "Error en login");
  }
};


return(

<div className="min-h-screen flex items-center justify-center bg-gray-100">

<div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">

<h2 className="text-2xl font-bold text-center text-primary mb-6">
Iniciar sesión
</h2>

<form onSubmit={handleSubmit} className="space-y-4">

<div>
<label>Email</label>
<input
type="email"
value={email}
onChange={(e)=>setEmail(e.target.value)}
className="w-full border px-4 py-2 rounded-lg"
/>
</div>

<div>
<label>Contraseña</label>
<input
type="password"
value={password}
onChange={(e)=>setPassword(e.target.value)}
className="w-full border px-4 py-2 rounded-lg"
/>
</div>

<Button type="submit">
Ingresar
</Button>

</form>

<p className="text-sm text-center mt-4">
¿No tienes cuenta?
<a href="/registro" className="text-primary font-semibold">
 Regístrate
</a>
</p>

</div>
</div>

)

}

export default Login;