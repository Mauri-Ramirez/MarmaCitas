import { Link, useNavigate } from "react-router-dom";
import { useContext } from "react";

import { AuthContext } from "../../context/AuthContext";

import logo from "../../assets/images/dental-care.png";



function Navbar(){

const { user, logout } = useContext(AuthContext);

const navigate = useNavigate();


const handleLogout = () => {
logout();
navigate("/login");
};


return(

<header className="bg-background shadow-sm sticky top-0 z-50">

<nav className="container mx-auto px-6 py-4 flex items-center justify-between">

{/* Logo */}
<Link to="/" className="flex items-center gap-2">

<img src={logo} className="w-10 h-10"/>

<h1 className="font-title text-xl font-semibold text-primary">
MarmaCitas
</h1>

</Link>


{/* Menú */}
<ul className="hidden md:flex gap-6 text-gray-700 font-medium">

<li><a href="#inicio">Inicio</a></li>
<li><a href="#servicios">Servicios</a></li>
<li><a href="#equipo">Equipo</a></li>

</ul>


{/* 🔥 LADO DERECHO DINÁMICO */}
<div className="flex gap-3 items-center">

{user ? (

<>
<span className="font-medium text-gray-700">
Hola, {user?.name || "Usuario"} 👋
</span>

<button
onClick={handleLogout}
className="px-4 py-2 bg-red-500 text-white rounded-lg"
>
Cerrar sesión
</button>
</>

) : (

<>
<Link
to="/login"
className="px-4 py-2 bg-primary text-white rounded-lg"
>
Iniciar sesión
</Link>

<Link
to="/registro"
className="px-4 py-2 border-2 border-primary text-primary rounded-lg"
>
Registrarse
</Link>
</>

)}

</div>

</nav>

</header>

)


}


export default Navbar;