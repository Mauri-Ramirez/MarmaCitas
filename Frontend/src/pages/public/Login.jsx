import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";

import Input from "../../components/common/Input";
import Button from "../../components/common/Button";

import { AuthContext } from "../../context/AuthContext";


function Login(){

const { login } = useContext(AuthContext);

const navigate = useNavigate();

const [email, setEmail] = useState("");
const [password, setPassword] = useState("");


const handleSubmit = (e) => {
e.preventDefault();


// Simulación de usuario (luego será backend)
let userData = null;

if(email === "paciente@test.com"){
userData = { role:"patient", name:"Paciente" };
navigate("/paciente");
}

else if(email === "doctor@test.com"){
userData = { role:"doctor", name:"Doctor" };
navigate("/odontologo");
}

else if(email === "recepcion@test.com"){
userData = { role:"receptionist", name:"Recepción" };
navigate("/recepcion");
}

else if(email === "admin@test.com"){
userData = { role:"admin", name:"Admin" };
navigate("/admin");
}

else{
alert("Usuario no válido");
return;
}


// Guardar en contexto
login(userData);

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