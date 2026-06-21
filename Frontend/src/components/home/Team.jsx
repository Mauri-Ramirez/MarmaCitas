import dentista1 from "../../assets/images/dentista.png";
import dentista2 from "../../assets/images/dentista2.png";


function Team(){

const doctors = [

{
name:"Dra. Laura Pérez",
specialty:"Odontología General",
image: dentista1,
description:"Especialista en atención preventiva y estética dental."
},

{
name:"Dr. Andrés Ramírez",
specialty:"Ortodoncista",
image: dentista2,
description:"Experto en corrección dental y alineadores."
},

{
name:"Dra. Maryuri Mosquera",
specialty:"Endodoncia",
image: dentista1,
description:"Especialista en tratamientos de conducto."
},

{
name:"Carlos Medina",
specialty:"Higienista Dental",
image: dentista2,
description:"Encargado de limpiezas y prevención."
}

];


return(

<section id="equipo" className="py-16 bg-background">

<div className="max-w-6xl mx-auto text-center px-6">


<h2 className="
text-3xl md:text-4xl
font-title
font-bold
text-primary
mb-4
">
NUESTRO EQUIPO
</h2>


<p className="text-text max-w-2xl mx-auto">

Contamos con profesionales altamente capacitados
para cuidar tu salud bucal.

</p>



<div className="
grid
gap-10
sm:grid-cols-2
lg:grid-cols-4
py-10
">


{doctors.map((doctor,index)=>(

<div
key={index}
className="
bg-white
shadow-lg
p-6
rounded-2xl
hover:shadow-2xl
transition
"
>


<img
src={doctor.image}
alt={doctor.name}
className="
w-32 h-32
mx-auto
rounded-full
object-cover
mb-4
"
/>


<h3 className="text-xl font-semibold text-gray-800">
{doctor.name}
</h3>


<p className="text-primary font-medium">
{doctor.specialty}
</p>


<p className="text-gray-500 mt-2 text-sm">
{doctor.description}
</p>


</div>

))}


</div>

</div>

</section>

)

}

export default Team;