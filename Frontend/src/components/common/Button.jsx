function Button({children, type="button", onClick}){

return(

<button
type={type}
onClick={onClick}
className="
px-5 py-2
rounded-lg
bg-blue-600
text-white
font-semibold
hover:bg-blue-700
transition
"
>

{children}

</button>

)

}

export default Button;