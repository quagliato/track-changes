const mongodb = require('mongodb')
const MongoClient = mongodb.MongoClient

const createClient = async (config) => {
  let authentication = ''
  if (config.MONGODB_SETTINGS.DB_USER && config.MONGODB_SETTINGS.DB_PASS) {
    authentication = `${config.MONGODB_SETTINGS.DB_USER}:${config.MONGODB_SETTINGS.DB_PASS}@`
  }
  let host = `${config.MONGODB_SETTINGS.DB_HOST}`
  if (config.MONGODB_SETTINGS.DB_HOST.indexOf(',') === -1) {
    host = `${host}:${config.MONGODB_SETTINGS.DB_PORT}`
  }
  const url = `mongodb://${authentication}${host}`
  return MongoClient.connect(url)
}

const createConnection = async (config) => {
  const client = await createClient(config)
  return client.db(config.MONGODB_SETTINGS.DB_NAME)
}

module.exports = async function (config) {
  let connection
  try {
    connection = await createConnection(config)
  } catch (e) {
    console.error(e)
    process.exit(1)
  }

  try {
    await connection.collection('test').find().toArray()
  } catch (e) {
    console.error(e)
    process.exit(1)
  }

  return connection
}
