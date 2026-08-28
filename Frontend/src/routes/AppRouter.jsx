import {
 BrowserRouter,
 Routes,
 Route
} from "react-router-dom";


import Home from "../pages/public/Home";
import Login from "../pages/public/Login";
import Register from "../pages/public/Register";


import PatientDashboard from "../pages/patient/PatientDashboard";
import DoctorDashboard from "../pages/doctor/DoctorDashboard";
import ReceptionDashboard from "../pages/reception/ReceptionDashboard";
import AdminDashboard from "../pages/admin/AdminDashboard";
import BookAppointment from "../pages/patient/BookAppointment";
import PatientProfile from "../pages/patient/PatientProfile";
import DoctorProfile from "../pages/doctor/DoctorProfile";
import DoctorAppointments from "../pages/doctor/DoctorAppointments";
import DoctorSchedule from "../pages/doctor/DoctorSchedule";
import ReceptionProfile from "../pages/reception/ReceptionProfile";
import AdminProfile from "../pages/admin/AdminProfile";


// Layouts
import PatientLayout from "../layouts/PatientLayout";
import DoctorLayout from "../layouts/DoctorLayout";
import ReceptionLayout from "../layouts/ReceptionLayout";
import AdminLayout from "../layouts/AdminLayout";
import PublicLayout from "../layouts/PublicLayout";
import PrivateRoute from "./PrivateRoute";
import PatientAppointments from "../pages/patient/PatientAppointments";


function AppRouter(){

return(

<BrowserRouter>

<Routes>


<Route 
path="/" 
element={
<PublicLayout>
<Home/>
</PublicLayout>
}
/>


<Route 
path="/login"
element={<Login/>}
/>


<Route
path="/registro"
element={<Register/>}
/>



<Route
path="/paciente"
element={
<PrivateRoute allowedRoles={["patient"]}>
  <PatientLayout>
    <PatientDashboard/>
  </PatientLayout>
</PrivateRoute>
}
/>
      
<Route
  path="/paciente/agendar"
  element={
    <PrivateRoute allowedRoles={["patient"]}>
      <PatientLayout>
        <BookAppointment />
      </PatientLayout>
    </PrivateRoute>
  }
/>
      
<Route
  path="/paciente/perfil"
  element={
    <PrivateRoute allowedRoles={["patient"]}>
      <PatientLayout>
        <PatientProfile />
      </PatientLayout>
    </PrivateRoute>
  }
/>




<Route
path="/odontologo"
element={
<PrivateRoute allowedRoles={["doctor"]}>
  <DoctorLayout>
    <DoctorDashboard/>
  </DoctorLayout>
</PrivateRoute>
}
/>

<Route
  path="/odontologo/perfil"
  element={
    <PrivateRoute allowedRoles={["doctor"]}>
      <DoctorLayout>
        <DoctorProfile />
      </DoctorLayout>
    </PrivateRoute>
  }
/>



<Route
path="/recepcion"
element={
<PrivateRoute allowedRoles={["receptionist"]}>
  <ReceptionLayout>
    <ReceptionDashboard/>
  </ReceptionLayout>
</PrivateRoute>
}
/>

<Route
  path="/recepcion/perfil"
  element={
    <PrivateRoute allowedRoles={["receptionist"]}>
      <ReceptionLayout>
        <ReceptionProfile />
      </ReceptionLayout>
    </PrivateRoute>
  }
/>




<Route
path="/admin"
element={
<PrivateRoute allowedRoles={["admin"]}>
  <AdminLayout>
    <AdminDashboard/>
  </AdminLayout>
</PrivateRoute>
}
/>

<Route
  path="/odontologo/horario"
  element={
    <PrivateRoute allowedRoles={["doctor"]}>
      <DoctorLayout>
        <DoctorSchedule />
      </DoctorLayout>
    </PrivateRoute>
  }
/>

<Route
  path="/odontologo/citas"
  element={
    <PrivateRoute allowedRoles={["doctor"]}>
      <DoctorLayout>
        <DoctorAppointments />
      </DoctorLayout>
    </PrivateRoute>
  }
/>

<Route
  path="/admin/perfil"
  element={
    <PrivateRoute allowedRoles={["admin"]}>
      <AdminLayout>
        <AdminProfile />
      </AdminLayout>
    </PrivateRoute>
  }
/>
      
   
  <Route
  path="/paciente/citas"
  element={
    <PrivateRoute allowedRoles={["patient"]}>
      <PatientLayout>
        <PatientAppointments />
      </PatientLayout>
    </PrivateRoute>
  }
/>




</Routes>

</BrowserRouter>

)

}


export default AppRouter;
