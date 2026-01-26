const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
// Use 0.0.0.0 to bind to all network interfaces (allows LAN access)
const hostname = process.env.HOSTNAME || '0.0.0.0'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      
      // Health check endpoint for quick connectivity testing
      if (parsedUrl.pathname === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ 
          status: 'ok', 
          timestamp: new Date().toISOString(),
          hostname: hostname,
          port: port
        }))
        return
      }
      
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })
  
  // Explicitly bind to 0.0.0.0 to allow network access
  server.listen(port, '0.0.0.0', (err) => {
    if (err) {
      console.error('Failed to start server:', err)
      throw err
    }
    console.log(`> Server ready on http://0.0.0.0:${port}`)
    console.log(`> Local access: http://localhost:${port}`)
    console.log(`> Network access: http://172.16.171.62:${port}`)
    console.log(`> Health check: http://0.0.0.0:${port}/api/health`)
  })
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully')
    server.close(() => {
      console.log('Server closed')
      process.exit(0)
    })
  })
})
