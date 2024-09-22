import axios from 'axios';

const API_URL = 'http://localhost:4000'; // Adjust if necessary

export const fetchBackground = async (chunkX: number, chunkY: number): Promise<string> => {
  try {
    const response = await axios.get(`${API_URL}/background`, {
      params: { x: chunkX, y: chunkY },
    });
    // console.log('Received background image:', response.data.imageData);
    return response.data.imageData; // The base64-encoded image data
  } catch (error) {
    console.error('Error fetching background:', error);
    throw error;
  }
};
