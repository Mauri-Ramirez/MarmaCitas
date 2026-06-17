function Testimonials(){

const testimonials = [

{
name:"Mariana López",
role:"Paciente de limpieza dental",
image:"https://randomuser.me/api/portraits/women/44.jpg",
text:"El sistema de citas es muy fácil de usar. Me atendieron justo a tiempo."
},

{
name:"Juan Esteban Rojas",
role:"Paciente de ortodoncia",
image:"https://randomuser.me/api/portraits/men/55.jpg",
text:"Recibí recordatorios y todo el proceso fue muy claro."
},

{
name:"Carolina Méndez",
role:"Paciente de urgencias",
image:"https://randomuser.me/api/portraits/women/68.jpg",
text:"Tuve una urgencia y me dieron cita el mismo día. Excelente atención."
}

];


return(

<section id="opiniones" className="py-16 bg-white">

<div className="max-w-6xl mx-auto px-6 text-center">


<h2 className="
text-3xl md:text-4xl
font-title
font-bold
text-primary
mb-4
">
Lo que nuestros pacientes dicen
</h2>


<p className="text-text max-w-2xl mx-auto">

La satisfacción de nuestros pacientes es nuestra mayor prioridad.

</p>



<div className="
grid
gap-8
md:grid-cols-3
py-10
">


{testimonials.map((item,index)=>(

<div
key={index}
className="
bg-gray-50
p-8
rounded-2xl
shadow
hover:shadow-lg
transition
"
>


<div className="flex justify-center mb-4">


<img
src={item.image}
alt={item.name}
className="
w-20 h-20
rounded-full
object-cover
"
/>


</div>


<p className="text-gray-600 italic mb-4">
“{item.text}”
</p>


<h3 className="font-semibold text-gray-800">
{item.name}
</h3>


<p className="text-primary text-sm">
{item.role}
</p>


</div>

))}


</div>

</div>

</section>

)

}

export default Testimonials;