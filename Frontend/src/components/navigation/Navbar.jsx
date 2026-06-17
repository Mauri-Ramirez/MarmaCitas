import { Link } from "react-router-dom";
import logo from "../../assets/images/dental-care.png";


function Navbar(){

return(

<header className="
bg-background
shadow-sm
sticky
top-0
z-50
">

<nav className="
container
mx-auto
px-6
py-4
flex
items-center
justify-between
">


<Link 
to="/"
className="flex items-center gap-2"
>

<img
src={logo}
alt="Logo MarmaCitas"
className="w-10 h-10"
/>


<h1 className="
font-title
text-xl
font-semibold
text-primary
">

MarmaCitas

</h1>

</Link>



<ul className="
hidden
md:flex
gap-6
text-gray-700
font-medium
">


<li>
<a href="#inicio">
Inicio
</a>
</li>


<li>
<a href="#servicios">
Servicios
</a>
</li>


<li>
<a href="#equipo">
Equipo
</a>
</li>


<li>
<a href="#opiniones">
Opiniones
</a>
</li>


<li>
<a href="#sobre-nosotros">
Nosotros
</a>
</li>


</ul>



<div className="flex gap-3">


<Link
to="/login"
className="
px-4
py-2
bg-primary
text-white
rounded-lg
font-semibold
"
>

Iniciar sesión

</Link>



<Link
to="/registro"
className="
px-4
py-2
border-2
border-primary
text-primary
rounded-lg
font-semibold
"
>

Registrarse

</Link>


</div>



</nav>

</header>

)

}


export default Navbar;