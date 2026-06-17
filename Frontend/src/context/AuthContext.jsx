import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export function AuthProvider({ children }) {

const [user, setUser] = useState(null);
const [loading, setLoading] = useState(true); //  IMPORTANTE


useEffect(() => {

const storedUser = localStorage.getItem("user");

if(storedUser){
setUser(JSON.parse(storedUser));
}

setLoading(false); //  TERMINA CARGA

}, []);


const login = (userData) => {
setUser(userData);
localStorage.setItem("user", JSON.stringify(userData));
};

const logout = () => {
setUser(null);
localStorage.removeItem("user");
};


return (

<AuthContext.Provider value={{ user, login, logout, loading }}>
{children}
</AuthContext.Provider>

);

}