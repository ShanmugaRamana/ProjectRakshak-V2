import axios from 'axios';

// --- IMPORTANT: CHOOSE ONE OF THE FOLLOWING ---

// OPTION A: If you are using the Android Emulator on the same computer
const API_BASE_URL = 'http://192.168.90.37:3000';

// OPTION B: If you are using a PHYSICAL PHONE on the same Wi-Fi network
// Find your computer's IP by running 'ipconfig' (Windows) or 'ifconfig' (Mac/Linux) in the terminal
// const API_BASE_URL = 'http://192.168.1.5:3000'; // <-- Replace with YOUR computer's IP

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

export default apiClient;