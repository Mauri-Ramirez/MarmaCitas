import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";


function Sidebar(){

const { logout } = useContext(AuthContext);


return(

<aside className="w-64 min-h-screen bg-blue-700 text-white p-5">

<h2 className="text-xl font-bold mb-6">
MarmaCitas
</h2>


<ul className="space-y-4">

<li>Inicio</li>
<li>Mis citas</li>
<li>Perfil</li>

<li
onClick={logout}
className="cursor-pointer text-red-300"
>
Cerrar sesión
</li>

</ul>

</aside>

)

}

export default Sidebar;