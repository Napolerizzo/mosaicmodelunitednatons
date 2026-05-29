const subscribers = new Set()

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const { email } = req.body
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email' })
  }
  subscribers.add(email.toLowerCase().trim())
  res.json({ success: true, message: 'Subscribed successfully' })
}
