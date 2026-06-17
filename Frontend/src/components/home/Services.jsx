import limpieza from "../../assets/images/limpieza-dental.png";
import ortodoncia from "../../assets/images/ortodoncia.png";
import extraccion from "../../assets/images/extraccion.png";
import blanqueamiento from "../../assets/images/blanqueamiento.png";
import endodoncia from "../../assets/images/endodoncia.png";
import estetica from "../../assets/images/estetica.png";


function Services(){

const services = [

{
title:"Limpieza Dental",
image: limpieza,
description:"Elimina placa y sarro para mantener tu sonrisa saludable."
},

{
title:"Ortodoncia",
image: ortodoncia,
description:"Corrige la posición de tus dientes con tratamientos modernos."
},

{
title:"Extracciones Dentales",
image: extraccion,
description:"Procedimientos seguros y sin dolor."
},

{
title:"Blanqueamiento Dental",
image: blanqueamiento,
description:"Devuelve el brillo natural a tu sonrisa."
},

{
title:"Endodoncia",
image: endodoncia,
description:"Tratamiento de conductos para salvar piezas dentales."
},

{
title:"Odontología Estética",
image: estetica,
description:"Mejora la apariencia de tu sonrisa."
}

];


return(

<section id="servicios" className="bg-white py-20">

<div className="container mx-auto px-6 text-center">


<h2 className="
text-3xl md:text-4xl
font-title
font-bold
text-primary
mb-4
">
NUESTROS SERVICIOS
</h2>


<p className="text-text max-w-2xl mx-auto">

En MarmaCitas ofrecemos atención integral para tu salud oral.

</p>



<div className="
grid
grid-cols-1
sm:grid-cols-2
lg:grid-cols-3
gap-10
py-10
">


{services.map((service,index)=>(

<div
key={index}
className="
bg-background
shadow-md
rounded-2xl
p-8
hover:shadow-lg
transition
"
>


<img
src={service.image}
alt={service.title}
className="w-20 h-20 mx-auto mb-4"
/>


<h3 className="text-xl font-semibold mb-2">
{service.title}
</h3>


<p className="text-text">
{service.description}
</p>


</div>

))}


</div>


</div>

</section>

)

}

export default Services;