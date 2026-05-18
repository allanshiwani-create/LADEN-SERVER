const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json({ limit: '20mb' }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const API_KEY = process.env.ANTHROPIC_API_KEY;

app.post('/scan-text', async (req, res) => {
  try {
    const { text } = req.body;
    console.log('Scanning text:', text?.substring(0, 50));
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
          content: `Read this gym workout. Return ONLY valid JSON, no markdown, no explanation:\n{"type":"CROSSFIT|HYROX|HYROX SIM|STRENGTH|RUNNING|EMOM|AMRAP|FOR TIME|OTHER","title":"short name","exercises":[{"name":"exercise","reps":"reps or time or distance","weight":"weight or null"}],"timecap":"timecap or null","rounds":"rounds or null","notes":"extra or null"}\nWorkout:\n${text}`
        }]
      })
    });
    const data = await response.json();
    console.log('Anthropic response:', JSON.stringify(data).substring(0, 200));
    const raw = data.content?.[0]?.text || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    res.json(parsed);
  } catch (e) {
    console.error('scan-text error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/scan-image', async (req, res) => {
  try {
    const { base64, mimeType } = req.body;
    console.log('Scanning image, mimeType:', mimeType, 'base64 length:', base64?.length);
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
            { type: 'image', source: { type: 'base64', media_type: mimeType || 'image/jpeg', data: base64 } },
            { type: 'text', text: 'Scan this gym whiteboard or billboard. Return ONLY valid JSON, no markdown:\n{"type":"CROSSFIT|HYROX|HYROX SIM|STRENGTH|RUNNING|EMOM|AMRAP|FOR TIME|OTHER","title":"short name","exercises":[{"name":"exercise","reps":"reps or time or distance","weight":"weight or null"}],"timecap":"timecap or null","rounds":"rounds or null","notes":"extra or null"}\nIf no workout visible return: {"error":"No workout found"}' }
          ]
        }]
      })
    });
    const data = await response.json();
    console.log('Anthropic image response:', JSON.stringify(data).substring(0, 200));
    const raw = data.content?.[0]?.text || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    res.json(parsed);
  } catch (e) {
    console.error('scan-image error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'LADEN server running' }));
app.get('/', (req, res) => res.json({ status: 'LADEN server running', version: '1.0' }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`LADEN server running on port ${PORT}`));
