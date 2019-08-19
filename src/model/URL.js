const mongodb = require('mongodb')

function URL (dbInstance, obj) {
  this.collection = 'url'
  this.mandatoryProperties = []
  this.dbInstance = dbInstance
  this.obj = {}
  if (obj) {
    Object.keys(obj).map(key => {
      this.obj[key] = obj[key]
    })
  }
}

URL.prototype.set = function (property, value) {
  const self = this
  if (typeof value === 'string' && value === undefined) return false
  if (typeof property === 'string') {
    this.obj[property] = value
    return true
  }

  Object.keys(property).map(key => {
    self.obj[key] = property[key]
  })
}

URL.prototype.get = function () {
  return this.obj
}

URL.prototype.save = function () {
  if (this.obj['_id'] === undefined) {
    return this.create()
  }
  return this.update()
}

URL.prototype.create = function () {
  const self = this
  this.obj.created = new Date()
  this.obj.status = 1
  self.mandatoryProperties.map(prop => {
    if (!this.obj[prop]) {
      throw new Error(`${self.collection}.${prop} is mandatory,`)
    }
  })

  return self.dbInstance.collection(this.collection).insert(this.obj)
    .then(result => {
      self.obj._id = result.ops[0]._id
      return self.obj
    })
    .catch(err => {
      throw err
    })
}

URL.prototype.update = function () {
  const self = this
  if (this.obj['_id'] === undefined) throw new Error('No _id setted.')
  self.obj.updated = new Date()

  const filter = {
    _id: mongodb.ObjectId(self.obj._id)
  }

  const update = {
    '$set': {}
  }

  Object.keys(self.obj).map(key => {
    update['$set'][key] = self.obj[key]
  })

  return self.dbInstance.collection(self.collection).update(filter, update)
    .then(() => self.obj)
    .catch(err => {
      throw err
    })
}

URL.prototype.delete = function () {
  if (this.obj['_id'] === undefined) throw new Error('No object to delete.')
  this.obj.deleted = new Date()
  this.obj.status = 0
  return this.update()
}

URL.prototype.getOne = function (id) {
  const self = this
  const searchFilter = {
    _id: mongodb.ObjectId(id),
    status: 1
  }

  return self.dbInstance.collection(self.collection).find(searchFilter).toArray()
    .then(result => {
      if (result.length !== 1) throw new Error('Record not found.')
      self.obj = result[0]
    })
    .catch(err => {
      throw err
    })
}

URL.prototype.list = function (settings) {
  const self = this

  if (!settings.filter) settings.filter = {}
  const searchFilter = {
    status: 1,
    ...settings.filter
  }

  let page = settings.page || 1
  let pageSize = settings.page_size || 20
  if (page <= 0) throw new Error('Invalid page')
  if (pageSize <= 0) throw new Error('Invalid page size')

  if (!settings.sort) settings.sort = {}
  const sort = {
    created: 1,
    ...settings.sort
  }

  return self.dbInstance.collection(self.collection).find(searchFilter)
    .collation({ locale: 'pt', strength: 2 }).sort(sort)
    .limit(pageSize).skip((page - 1) * pageSize)
    .toArray()
    .then(result => {
      return result.map(item => new URL(self.dbInstance, item))
    })
    .catch(err => {
      throw err
    })
}

URL.prototype.count = function (filter) {
  const self = this
  if (!filter) filter = {}
  const searchFilter = {
    status: 1,
    ...filter
  }
  return self.dbInstance.collection(self.collection).count(searchFilter)
    .catch(err => {
      throw err
    })
}

module.exports = URL
