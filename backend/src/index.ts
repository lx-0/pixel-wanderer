import express from 'express';
import cors from 'cors';
import path from 'path';
import NodeCache from 'node-cache';
import fs from 'fs';
import { promisify } from 'util';

const app = express();
const PORT = 4000;

const cache = new NodeCache({ stdTTL: 3600 }); // Cache TTL of 1 hour

app.use(cors());
app.use(express.json());

// Promisify fs.readFile
const readFileAsync = promisify(fs.readFile);

app.use('/static', express.static(path.join(__dirname, 'public')));

// Define API endpoints here
app.get('/', (req, res) => {
  res.send('Pixel Wanderer Backend is running!');
});

app.get('/background', async (req, res) => {
  const { x, y } = req.query;

  try {
    // For now, use the same static image for all chunks
    const imagePath = path.join(__dirname, '../public/background.png');

    // Read the image file
    const imageData = await readFileAsync(imagePath);

    // Convert to base64
    const base64Image = imageData.toString('base64');

    // Determine the content type based on the image extension
    const contentType = 'image/png'; // Adjust if using a different image format

    // Send the base64 image data
    res.json({
      imageData: `data:${contentType};base64,${base64Image}`,
    });
  } catch (error) {
    console.error('Error reading background image:', error);
    res.status(500).json({ error: 'Failed to load background image' });
  }
});

async function generateBackgroundImage(x: number, y: number): Promise<string> {
  const cacheKey = `background_${x}_${y}`;

  // Check if image URL is in cache
  let imageUrl = cache.get<string>(cacheKey);
  if (imageUrl) {
    return imageUrl;
  }

  // If not in cache, generate the image
  // Replace with actual AI API call
  /*
  const response = await axios.post('https://api.example.com/generate', {
    prompt: `Background chunk at (${x}, ${y})`,
  });
  imageUrl = response.data.imageUrl;
  */

  // For placeholder
  imageUrl = `/assets/background.png`;

  // Store in cache
  cache.set(cacheKey, imageUrl);

  return imageUrl;
}

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
