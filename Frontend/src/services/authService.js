import axios from "../api/axios";

const API_URL = "http://localhost:5000/api/auth";

export const loginRequest = async (data) => {
  const res = await axios.post(`${API_URL}/login`, data);
  return res.data;
};

export const registerRequest = async (data) => {
  const res = await axios.post(`${API_URL}/register`, data);
  return res.data;
};
