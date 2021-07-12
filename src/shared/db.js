const { MongoClient } = require('mongodb')

const createClient = (config) => {
  const client = new MongoClient()
  return client.connect(config.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
}

const createConnection = async (config) => {
  const client = await createClient(config)
  return client.db(config.MONGODB_NAME)
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
    await connection.collection('url').find().toArray()
  } catch (e) {
    console.error(e)
    process.exit(1)
  }

  return connection
}
