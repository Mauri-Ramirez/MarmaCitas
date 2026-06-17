import Input from "../../components/common/Input";
import Button from "../../components/common/Button";


function Register(){

return(

<div className="
min-h-screen
flex
items-center
justify-center
bg-gray-100
">

<div className="
bg-white
p-8
rounded-2xl
shadow-lg
w-full
max-w-md
">


<h2 className="
text-2xl
font-bold
text-center
text-primary
mb-6
">
Crear cuenta
</h2>


<form className="space-y-4">

<Input
label="Nombre"
placeholder="Tu nombre"
/>

<Input
label="Correo electrónico"
type="email"
/>

<Input
label="Contraseña"
type="password"
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