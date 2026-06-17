import dentista from "../../assets/images/dentista.png";

function Hero() {

return(

<section className="
min-h-screen
flex
items-center
bg-gray-50
">


<div className="
max-w-7xl
mx-auto
px-6
grid
md:grid-cols-2
gap-10
items-center
">


<div>


<h1 className="
text-5xl
font-bold
text-blue-700
">

Tu sonrisa,
nuestra prioridad

</h1>


<p className="
mt-5
text-gray-600
text-lg
">

Agenda tus citas odontológicas
de forma rápida y segura.

</p>


<button className="
mt-6
bg-blue-600
text-white
px-6
py-3
rounded-lg
hover:bg-blue-700
">

Agendar cita

</button>


</div>


<div>

<img

src={dentista}

alt="Odontólogo"

className="
w-full
max-w-md
mx-auto
"

/>

</div>


</div>


</section>

)

}

export default Hero;