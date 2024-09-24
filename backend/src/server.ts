import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import backgroundRoute from './routes/backgroundRoute';
import { LOGGER_CONFIG } from './config/Logger.config';
import { Logger } from './utils/Logger';

export const log = new Logger(LOGGER_CONFIG);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// app.use('/static', express.static(path.join(__dirname, 'public')));

// Define API endpoints here
app.get('/', (req, res) => {
  res.send('Pixel Wanderer Backend is running!');
});

app.use('/background', backgroundRoute);

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
