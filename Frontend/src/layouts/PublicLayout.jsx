import Navbar from "../components/navigation/Navbar";


function PublicLayout({children}){

return(

<div className="bg-background">

<Navbar/>


{children}


</div>

)

}


export default PublicLayout;