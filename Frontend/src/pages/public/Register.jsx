import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Input from "../../components/common/Input";
import Button from "../../components/common/Button";

import { registerRequest } from "../../services/authService";


function Register(){

const navigate = useNavigate();

const [name, setName] = useState("");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");


const handleSubmit = async (e) => {
e.preventDefault();
console.log(name, email, password);

  try {
console.log(name, email, password);
    await registerRequest({
      name,
      email,
      password
    });

    alert("Usuario creado");
    navigate("/login");

  } catch (error) {
    alert(error.response?.data?.message || "Error en registro");
  }
};


return(

<div className="min-h-screen flex items-center justify-center bg-gray-100">

<div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">

<h2 className="text-2xl font-bold text-center text-primary mb-6">
Crear cuenta
</h2>

<form onSubmit={handleSubmit} className="space-y-4">

<Input
label="Nombre"
value={name}
onChange={(e)=>setName(e.target.value)}
placeholder="Tu nombre"
/>

<Input
label="Correo electrónico"
type="email"
value={email}
onChange={(e)=>setEmail(e.target.value)}
/>

<Input
label="Contraseña"
type="password"
value={password}
onChange={(e)=>setPassword(e.target.value)}
/>

<Button type="submit">
Registrarse
</Button>

</form>

<p className="text-sm text-center mt-4">
¿Ya tienes cuenta?  
<a href="/login" className="text-primary font-semibold">
 Inicia sesión
</a>
</p>

</div>
</div>

)

}

export default Register;