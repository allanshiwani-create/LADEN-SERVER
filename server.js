const express = require('express');
const app = express();
app.use(express.json({ limit: '10mb' }));

// Allow all origins for mobile app
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const API_KEY = process.env.ANTHROPIC_API_KEY;

// Text scan endpoint
app.post('/scan-text', async (req, res) => {
  try {
    const { text } = req.body;
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: `Read this gym whiteboard workout. Return ONLY valid JSON, no markdown:\n{"type":"CROSSFIT|HYROX|HYROX SIM|STRENGTH|RUNNING|EMOM|AMRAP|FOR TIME|OTHER","title":"short name","exercises":[{"name":"exercise","reps":"reps/time/distance","weight":"weight or null"}],"timecap":"timecap or null","rounds":"rounds or null","notes":"extra or null"}\nWorkout: ${text}`
        }]
      })
    });
    const data = await response.json();
    const text_response = data.content?.[0]?.text || '';
    const parsed = JSON.parse(text_response.replace(/```json|```/g, '').trim());
    res.json(parsed);
  } catch (e) {
    res.status(500).json({ error: 'Could not read workout' });
  }
});

// Image scan endpoint
app.post('/scan-image', async (req, res) => {
  try {
    const { base64, mimeType } = req.body;
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
            { type: 'text', text: 'Scan this gym whiteboard. Return ONLY valid JSON, no markdown:\n{"type":"CROSSFIT|HYROX|HYROX SIM|STRENGTH|RUNNING|EMOM|AMRAP|FOR TIME|OTHER","title":"short name","exercises":[{"name":"exercise","reps":"reps/time/distance","weight":"weight or null"}],"timecap":"timecap or null","rounds":"rounds or null","notes":"extra or null"}\nIf no workout visible: {"error":"No workout found"}' }
          ]
        }]
      })
    });
    const data = await response.json();
    const text_response = data.content?.[0]?.text || '';
    const parsed = JSON.parse(text_response.replace(/```json|```/g, '').trim());
    res.json(parsed);
  } catch (e) {
    res.status(500).json({ error: 'Could not read image' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'LADEN server running' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`LADEN server running on port ${PORT}`));
