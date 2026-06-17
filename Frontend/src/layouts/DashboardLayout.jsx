import Sidebar from "../components/navigation/Sidebar";


function DashboardLayout({children}){


return(

<div className="
flex
min-h-screen
bg-gray-100
">


<Sidebar/>


<main className="
flex-1
p-8
">


{children}


</main>


</div>


)


}


export default DashboardLayout;