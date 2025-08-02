import axios from "axios";

export const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  return "http://localhost:5001";
};

export const axiosInstance = axios.create({
  baseURL: `${getBaseUrl()}/api`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json"
  }
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("jwt");
    
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.request.use(
  (config) => {
    try {
    if (config.method === 'delete') {
        if (config.data) {
          config.headers['Content-Type'] = 'application/json';
        }
      }
      
      if (import.meta.env.MODE === 'development') {
        console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config);
      }
      return config;
    } catch (err) {
      console.error('[API Request Config Error]', err);
      return config;
    }
  },
  (error) => {
    console.error("[API Request Error]", error);
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => {
    if (import.meta.env.MODE === 'development') {
      console.log("Axios response:", response.status, response.statusText);
    }
    return response;
  },
  (error) => {
    console.error("Axios response error:", error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);
