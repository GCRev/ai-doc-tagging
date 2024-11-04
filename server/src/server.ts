import childProcess from 'child_process'
import path from 'path'
import express from 'express'

import homepage from './homepage.js'

const app = express()

const PORT = process.env.PORT || 4001
const API_URL = process.env.API_URL || '/api'

if (process.env.NODE_ENV === 'dev') {
  const child = childProcess.spawn('npm', [ 'run', 'dev' ], {
    cwd: path.resolve(process.cwd(), '../viewer'),
    stdio: 'inherit'
  })

  child.on('close', () => { process.exit(0) })
} else {
  app.use(homepage)
}

app.post(`${API_URL}/process_document/:name`, express.text({ type: 'text/*' }), async (req, res) => {
  const { name } = req.params

  const contents = req.body

  const input = { name, contents }
  const pypath = path.resolve(process.cwd(), '../venv/bin/python3')
  const child = childProcess.spawn(pypath, [ 'tags.py', JSON.stringify(input) ], {
    cwd: path.resolve(process.cwd(), '../'),
    stdio: 'pipe'
  })

  let result = ''
  let err = ''

  child.stdout.on('data', (data: Buffer) => {
    result += data.toString('utf8')
  })
  child.stderr.on('data', (data: Buffer) => {
    err += data.toString('utf8')
  })
  child.on('close', () => {
    try {
      const parsed = JSON.parse(result)
      res.status(200)
      res.json(parsed)
    } catch (e) {
      res.status(500)
      res.statusMessage = (e as Error).message
      res.end()
    }
  })
  
});

app.post(`${API_URL}/pandoc`, express.text({ type: 'text/*' }), async (req, res) => {
  const contents = req.body

  const pandocpath = path.resolve(process.cwd(), '../pandoc-3.5/bin/pandoc')
  const child = childProcess.spawn(pandocpath, [ '-f', 'commonmark_x+hard_line_breaks', '-t', 'html' ], {
    cwd: path.resolve(process.cwd(), '../'),
    stdio: 'pipe'
  })

  child.stdin.write(contents)
  child.stdin.end()

  let result = ''
  child.stdout.on('data', (data: Buffer) => {
    result += data.toString('utf8')
  })
  child.on('close', () => {
    try {
      res.status(200)
      res.contentType('text/html')
      res.send(result)
    } catch (e) {
      res.status(500)
      res.end()
    }
  })
})


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
