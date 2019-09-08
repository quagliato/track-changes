const mongodb = require('mongodb')
const S3 = require('../shared/S3')
const URL = require('../model/URL')
const sgMail = require('@sendgrid/mail')
const got = require('got')
const diff = require('diff')
const parseDomain = require('parse-domain')

const urlAlreadyExists = (url, email) => {
  if (url.get().emails && url.get().emails.indexOf(email) >= 0) {
    return url.get()._id
  }
  if (!url.get().emails) url.set('emails', [])
  url.get().emails.push(email)
  url.set('emails', url.get().emails)
  return url.save()
    .then(() => url.get()._id)
}

const saveNewURL = (url, body) => {
  return url.save()
    .then(() => body)
}

const saveS3 = (config, url, body) => {
  const s3 = new S3(config)
  s3.put(url.get()._id.toString(), body)
    .then(() => url.get()._id)
}

const newURL = (config, url) => {
  return got.get(url.get().url)
    .then(res => saveNewURL(url, res.body))
    .then(body => saveS3(config, url, body))
}

const create = (req, res) => {
  if (!req.body.url) return res.sendStatus(500).end()
  if (!req.body.email) return res.sendStatus(500).end()

  const listSettings = {
    filter: {
      url: req.body.url
    }
  }

  let url = new URL(req.dbInstance)
  return url.list(listSettings)
    .then(list => {
      if (list.length === 1) return urlAlreadyExists(list[0], req.body.email)
      url.set({
        url: req.body.url,
        emails: [req.body.email]
      })
      return newURL(req.config, url)
    })
    .then(id => res.json({
      id
    }))
    .catch(err => {
      console.log(err)
      return res.sendStatus(500).end()
    })
}

const get = (req, res) => {
  const listSettings = {
    filter: {}
  }

  if (req.params.id) listSettings.filter._id = mongodb.ObjectId(req.params.id)

  const url = new URL(req.dbInstance)

  return url.list(listSettings)
    .then(result => res.json(result.map(record => record.get())))
    .catch(err => {
      console.log(err)
      return res.sendStatus(500).end()
    })
}

const deleteX = (req, res) => {
  const s3 = new S3(req.config)
  const url = new URL(req.dbInstance)
  return url.getOne(req.params.id)
    .then(() => s3.remove(url.get()._id.toString()))
    .then(() => url.delete())
    .then(() => res.sendStatus(200).end())
    .catch(err => {
      console.log(err)
      return res.sendStatus(500).end()
    })
}

const composeSiteName = (url) => Object.values(parseDomain(url)).filter(value => value !== "").reverse().join(".")

const sendEmail = (config, url, diff) => {
  sgMail.setApiKey(config.SENDGRID_API_KEY)
  return Promise.all(
    url.get().emails.map(email => {
      const msg = {
        to: email,
        from: 'no-reply@quagliato.me',
        subject: `The content of ${composeSiteName(url.get().url)} was updated`,
        text: `The url ${url.get().url} (which we are tracking for you) was updated moments ago.\nRefer to the page to see the updated version.\nThis is the difference: ${diff}`,
        html: `<p>The url ${url.get().url} (which we are tracking for you) was updated moments ago.</p><p>Refer to the page to see the updated version.</p><p>This is the difference:</p><br>${diff}`
      }
      return sgMail.send(msg)
    })
  )
}

const composeDiff = (diff) => {
  const difference = diff.diffChars(oldBody, newBody)
  const differenceString = difference.map(part => `${part.added ? "++" : part.removed ? "--" : ".."} ${part.value}`)
  if (differenceString.length > 5) return "(Too big to show here.)"
  return differenceString.join("\n")
}

const updateURL = (config, url, newBody, diff) => {
  console.log(`${url.get()._id} - There's a new version os this URL, updating it...`)
  url.set('updated', new Date())
  const s3 = new S3(config)
  return s3.put(url.get()._id.toString(), newBody)
    .then(() => {
      console.log(`${url.get()._id} - Saved to S3.`)
      return url.save()
    })
    .then(() => {
      console.log(`${url.get()._id} - Updated MongoDB.`)
      return sendEmail(config, url, composeDiff(diff))
    })
    .then(() => {
      console.log(`${url.get()._id} - Sent e-mail`)
      return url.get()
    })
}

const processURL = (config, url) => {
  console.log(`Processing ${url.get()._id}`)
  const s3 = new S3(config)
  console.log(`${url.get()._id} - Requesting to ${url.get().url}`)
  return Promise.all([
    got.get(url.get().url),
    s3.get(url.get()._id.toString())
  ])
    .then(result => {
      const newBody = result[0].body
      const oldBody = result[1]
      const difference = diff.diffChars(newBody, oldBody)
      const filteredDifference = difference.filter(part => part.added || part.removed)
      console.log(`${url.get()._id} - Found ${filteredDifference.length} differences`)
      if (filteredDifference.length === 0) {
        console.log(`${url.get()._id} - New URL is the same as the stored in S3`)
        return url.get()
      }

      return updateURL(config, url, newBody, filteredDifference)
    })
    .catch(err => {
      console.log(`${url.get()._id} - Could not process the URL.`, err)
      return {
        ...url.get(),
        err
      }
    })
}

const trackChanges = (req, res) => {
  const url = new URL(req.dbInstance)
  return url.list({})
    .then(urls => Promise.all(urls.map(url => processURL(req.config, url))))
    .then(results => res.json(results))
    .catch(() => {
      return res.sendStatus(500).end()
    })
}

module.exports = {
  create,
  get,
  deleteX,
  trackChanges
}
