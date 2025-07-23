import axios from 'axios';

const API = axios.create({
  baseURL: "http://localhost:5000/api", 
});

API.interceptors.request.use(config => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default API;
export const fetchUser = async () => {
  try {
    const res = await API.get("/me");
    return res.data.user;
  } catch (err) {
    console.error("Failed to fetch user:", err);
    return null;
  }
};