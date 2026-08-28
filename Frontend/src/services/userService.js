import axios from "../api/axios";

export const getMyProfile = async () => {
  const res = await axios.get("/users/me");

  return res.data;
};

export const updateMyProfile = async (data) => {
  const res = await axios.put("/users/me", data);

  return res.data;
};
