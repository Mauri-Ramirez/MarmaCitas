function Footer(){

return(

<footer className="bg-gray-900 text-gray-300 py-10">

<div className="
max-w-6xl
mx-auto
px-6
grid
md:grid-cols-4
gap-8
">


{/* Marca */}
<div>

<h3 className="text-2xl font-bold text-white mb-3">
MarmaCitas
</h3>

<p className="text-sm">

Tu consultorio odontológico de confianza.

</p>

</div>


{/* Links */}
<div>

<h4 className="text-lg font-semibold text-white mb-3">
Enlaces
</h4>

<ul className="space-y-2">

<li><a href="#inicio">Inicio</a></li>
<li><a href="#servicios">Servicios</a></li>
<li><a href="#equipo">Equipo</a></li>

</ul>

</div>


{/* Contacto */}
<div>

<h4 className="text-lg font-semibold text-white mb-3">
Contacto
</h4>

<ul className="space-y-2">

<li>📍 Colombia</li>
<li>📞 +57 300 000 000</li>
<li>✉️ contacto@marmaCitas.com</li>

</ul>

</div>


{/* Redes */}
<div>

<h4 className="text-lg font-semibold text-white mb-3">
Síguenos
</h4>

<div className="flex gap-4">

<span>Facebook</span>
<span>Instagram</span>

</div>

</div>


</div>


<div className="text-center mt-10 text-sm">

© 2025 MarmaCitas

</div>

</footer>

)

}

export default Footer;