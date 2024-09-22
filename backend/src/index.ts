import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

// Define API endpoints here
app.get('/', (req, res) => {
  res.send('Pixel Wanderer Backend is running!');
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
