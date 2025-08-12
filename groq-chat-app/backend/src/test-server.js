const express = require('express');
const app = express();

app.get('/test', (req, res) => {
  res.json({ message: 'Test successful' });
});

const PORT = 3000;
app.listen(PORT, '0.0.0.0', (error) => {
  if (error) {
    console.error('Error starting server:', error);
    return;
  }
  console.log(`Test server is running on http://localhost:${PORT}`);
});
