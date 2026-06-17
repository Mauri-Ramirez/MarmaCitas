import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";


function PrivateRoute({ children, allowedRoles }){

const { user, loading } = useContext(AuthContext);


//  ESPERAR A QUE TERMINE DE CARGAR
if(loading){
return <p>Cargando...</p>; // puedes poner spinner luego
}


// No logueado
if(!user){
return <Navigate to="/login" />;
}


// Rol no permitido
if(!allowedRoles.includes(user.role)){
return <Navigate to="/" />;
}


// Acceso permitido
return children;

}

export default PrivateRoute;