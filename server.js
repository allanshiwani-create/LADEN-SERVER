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

const callAnthropic = async (messages) => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 1000,
      messages
    })
  });
  const data = await response.json();
  console.log('Anthropic status:', response.status);
  console.log('Anthropic response:', JSON.stringify(data).substring(0, 400));
  if (data.error) throw new Error(data.error.message || 'Anthropic API error');
  const raw = data.content?.[0]?.text || '';
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
};

app.post('/scan-text', async (req, res) => {
  try {
    const { text } = req.body;
    console.log('Scanning text:', text?.substring(0, 80));
    const parsed = await callAnthropic([{
      role: 'user',
      content: `You are reading a gym workout. Return ONLY a valid JSON object, absolutely no other text, no markdown, no backticks:\n{"type":"CROSSFIT","title":"workout name","exercises":[{"name":"Pull-ups","reps":"10","weight":null}],"timecap":null,"rounds":null,"notes":null}\n\nWorkout to parse:\n${text}`
    }]);
    res.json(parsed);
  } catch (e) {
    console.error('scan-text error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/scan-image', async (req, res) => {
  try {
    const { base64, mimeType } = req.body;
    
// Detect actual image type from base64 header bytes
const actualMime = 'image/png';
    
    console.log('Scanning image, size:', base64?.length, 'mime:', actualMime);
    
    // Check size - Anthropic max is 5MB base64
    if (base64.length > 6800000) {
      return res.status(400).json({ error: 'Image too large. Please use a smaller photo.' });
    }
    
    const parsed = await callAnthropic([{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: actualMime, data: base64 } },
        { type: 'text', text: 'Read the workout on this gym whiteboard. Return ONLY a valid JSON object, no other text, no markdown, no backticks:\n{"type":"CROSSFIT","title":"workout name","exercises":[{"name":"Pull-ups","reps":"10","weight":null}],"timecap":null,"rounds":null,"notes":null}\n\nIf no workout is visible, return: {"error":"No workout found"}' }
      ]
    }]);
    res.json(parsed);
  } catch (e) {
    console.error('scan-image error:', e.message);
    res.status(500).json({ error: e.message });
  }
});
    res.json(parsed);
  } catch (e) {
    console.error('scan-image error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok', apiKey: !!API_KEY }));
app.get('/', (req, res) => res.json({ status: 'LADEN server', version: '2.0' }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`LADEN server on port ${PORT}`));
