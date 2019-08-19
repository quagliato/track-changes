const bodyParser = require('body-parser')
const db = require('./src/shared/db')
const express = require('express')
const URL = require('./src/controller/URL')

async function run () {
  const config = (process.env.TRACK_CHANGES_CONFIG
    ? JSON.parse(process.env.TRACK_CHANGES_CONFIG)
    : require('./config.json'))
  const dbInstance = await db(config)
  const app = express()

  app.use(bodyParser.json())
  app.use((req, res, next) => {
    req.config = config
    next()
  })

  app.use((req, res, next) => {
    req.dbInstance = dbInstance
    next()
  })

  app.post('/track', URL.create)
  app.get('/track/:id?', URL.get)
  app.delete('/track/:id', URL.deleteX)
  app.post('/track-changes', URL.trackChanges)

  app.listen(process.env.PORT || 3000)
  console.log(`Listing port ${process.env.PORT || 3000}...`)
}

run()
