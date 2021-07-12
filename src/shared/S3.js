const awsSdk = require('aws-sdk')
function S3 (config) {
  this.config = config
  this.s3 = new awsSdk.S3({
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
    region: config.AWS_S3_REGION,
    bucket: config.AWS_S3_BUCKET
  })
}
S3.prototype.put = function (key, body, headers) {
  const self = this
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: self.config.AWS_S3_BUCKET,
      Key: key,
      Body: body
    }
    self.s3.upload(params, (err, data) => {
      if (err) reject(err)
      resolve(data)
    })
  })
}
S3.prototype.remove = function (key, body, headers) {
  const self = this
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: self.config.AWS_S3_BUCKET,
      Key: key
    }
    self.s3.deleteObject(params, (err, data) => {
      if (err) reject(err)
      resolve(data)
    })
  })
}
S3.prototype.get = function (key, body, headers) {
  const self = this
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: self.config.AWS_S3_BUCKET,
      Key: key
    }
    self.s3.getObject(params, (err, data) => {
      if (err || !data || !data.Body) {
        return resolve('')
      }

      return resolve(String(data.Body))
    })
  })
}
module.exports = S3
