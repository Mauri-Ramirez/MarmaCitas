function Input({
label,
type="text",
placeholder
}){


return(

<div className="flex flex-col gap-2">


<label className="font-medium">
{label}
</label>


<input

type={type}

placeholder={placeholder}

className="
border
rounded-lg
px-4
py-2
focus:outline-none
focus:ring-2
focus:ring-blue-500
"

/>

</div>

)

}


export default Input;