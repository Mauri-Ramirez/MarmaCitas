function Input({ label, type="text", value, onChange, placeholder }){

return(

<div>
<label>{label}</label>

<input
type={type}
value={value}
onChange={onChange}
placeholder={placeholder}
className="w-full border px-4 py-2 rounded-lg"
/>

</div>

)

}

export default Input;