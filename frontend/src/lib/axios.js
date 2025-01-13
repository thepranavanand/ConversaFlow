import axios from "axios";

// Get the deployed backend URL or use localhost in development
export const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  return "http://localhost:5001";
};

// Create an axios instance that includes credentials
export const axiosInstance = axios.create({
  baseURL: `${getBaseUrl()}/api`,
  withCredentials: true, // Include cookies
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json"
  }
});

// Add a request interceptor to include the JWT token in all requests
axiosInstance.interceptors.request.use(
  (config) => {
    // Try to get token from localStorage
    const token = localStorage.getItem("jwt");
    
    // If token exists, include it in the Authorization header
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Request interceptor for debugging
axiosInstance.interceptors.request.use(
  (config) => {
    try {
          // Special handling for DELETE requests
    if (config.method === 'delete') {
      // Make sure the data is properly attached
        if (config.data) {
          config.headers['Content-Type'] = 'application/json';
        }
      }
      
      // Debug API requests in development only
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

// Response interceptor for debugging (development only)
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
