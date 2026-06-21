import clinic from "../../assets/images/dental-clinic.png";


function About(){

return(

<section id="sobre-nosotros" className="py-20 bg-blue-50">

<div className="
max-w-6xl
mx-auto
px-6
grid
md:grid-cols-2
gap-12
items-center
">


{/* Imagen */}
<div className="flex justify-center">

<img
src={clinic}
alt="Consultorio odontológico"
className="rounded-2xl shadow-lg"
/>

</div>


{/* Texto */}
<div>

<h2 className="
text-3xl md:text-4xl
font-title
font-bold
text-primary
mb-4
">
Sobre nuestro consultorio
</h2>


<p className="text-text mb-4">

En MarmaCitas creemos que la salud bucal es esencial.
Ofrecemos atención profesional, cálida y humana.

</p>


<p className="text-text mb-4">

Nuestra plataforma te permite agendar, modificar
y consultar citas de forma fácil y rápida.

</p>


<p className="text-text">

Más que un consultorio, somos una familia
dedicada a cuidar sonrisas.

</p>


</div>


</div>

</section>

)

}

export default About;