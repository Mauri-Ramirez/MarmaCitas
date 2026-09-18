import axios from "../api/axios";

export const loginRequest = async (data) => {
  const res = await axios.post("/auth/login", data);

  return res.data;
};

export const registerRequest = async (data) => {
  const res = await axios.post("/auth/register", data);

  return res.data;
};
