import express from 'express'
import cors from 'cors'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

// In-memory store (replace with DB in production)
const subscribers = new Set()

app.post('/api/notify', (req, res) => {
  const { email } = req.body
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email' })
  }
  subscribers.add(email.toLowerCase().trim())
  console.log(`New subscriber: ${email} (total: ${subscribers.size})`)
  res.json({ success: true, message: 'Subscribed successfully' })
})

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', subscribers: subscribers.size })
})

app.listen(PORT, () => {
  console.log(`Mosaic MUN server running on port ${PORT}`)
})
