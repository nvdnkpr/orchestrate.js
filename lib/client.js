// Copyright 2013 Bowery Software, LLC
/**
 * @fileoverview Orchestrate API Client.
 */


// Module Dependencies.
var request = require('request')
var url = require('url')
var Q = require('kew')
var assert = require('assert')
var SearchBuilder = require('./search')
var GraphBuilder = require('./graph')
var EventBuilder = require('./event')


/**
 * Creates an instance of Client which can be used to access
 * the Orchestrate API.
 *
 * @constructor
 * @param {string} token
 */
function Client (token) {
  assert(token, 'API key required.')
  if (!(this instanceof Client)) {
    return new Client(token)
  }

  /**
   * HTTP content-type.
   * @type {string}
   */
  this.contentType = 'application/json'

  /**
   * API token used for HTTP Authentication.
   * @type {string}
   * @protected
   */
  this._token = token
}


/**
 * Api endpoint v0.
 * @enum {string}
 */
Client.ApiEndPoint = 'api.orchestrate.io/v0'


/**
 * Get data from collection by key-value.
 * @param {string} collection
 * @param {string} key
 * @return {Promise}
 */
Client.prototype.get = function (collection, key) {
  assert(collection && key, 'Collection and key required.')
  return this._get(this.generateApiUrl([collection, key]))
}


/**
 * Get list of data from collection.
 * @param {string} collection
 * @param {number} limit
 * @param {string} startKey
 * @param {string} endKey
 * @return {Promise}
 */
Client.prototype.list = function (collection, limit, startKey, endKey) {
  assert(collection, 'Collection required.')
  if (limit) assert(typeof limit == 'number', 'Limit must be a number.')
  return this._get(this.generateApiUrl([collection], {
    limit: limit,
    startKey: startKey,
    endKey: endKey
  }))
}


/**
 * Put data in collection by key-value
 * @param {string} collection
 * @param {string} key
 * @param {Object} data
 * @param {string|boolean}
 * @return {Promise}
 */
Client.prototype.put = function (collection, key, data, match) {
  assert(collection && key && data, 'Collection, key, and JSON object required.')
  var header = {}
  if (typeof match == 'string') header['If-Match'] = this._quote(match)
  else if (typeof match == 'boolean' && match === false) header['If-None-Match'] = '"*"'
  return this._put(this.generateApiUrl([collection, key]), data, header)
}


/**
 * Remove data from collection by key-value.
 * @param {string} collection
 * @param {string} key
 * @param {boolean} purge
 * @return {Promise}
 */
Client.prototype.remove = function (collection, key, purge) {
  assert(collection && key, 'Collection and key required.')
  return this._del(this.generateApiUrl([collection, key], {purge: purge}))
}


/**
 * Search collection by key.
 * @param {string} collection
 * @param {string} query
 * @return {Promise}
 */
Client.prototype.search = function (collection, query) {
  assert(collection && query, 'Collection and query required.')
  return this._get(this.generateApiUrl([collection], {query: query}))
}


/**
 * Delete a collection.
 * @param {string} collection
 * @return {Promise}
 */
Client.prototype.deleteCollection = function (collection) {
  assert(collection, 'Collection required.')
  return this._del(this.generateApiUrl([collection]) + '?force=true')
}


/**
 * Create new search builder.
 * @return {SearchBuilder}
 */
Client.prototype.newSearchBuilder = function () {
  return new SearchBuilder()
    .setWrite(false)
    .setDelegate(this)
}


/**
 * Create new graph builder.
 * @return {GraphBuilder}
 */
Client.prototype.newGraphBuilder = function () {
  return new GraphBuilder()
    .setWrite(true)
    .setDelegate(this)
}


/**
 * Create new graph reader.
 * @return {GraphBuilder}
 */
Client.prototype.newGraphReader = function () {
  return new GraphBuilder()
    .setWrite(false)
    .setDelegate(this)
}


/**
 * Create new event builder.
 * @return {EventBuilder}
 */
Client.prototype.newEventBuilder = function () {
  return new EventBuilder()
    .setWrite(true)
    .setDelegate(this)
}


/**
 * Create new event reader.
 * @return {EventBuilder}
 */
Client.prototype.newEventReader = function () {
  return new EventBuilder()
    .setWrite(false)
    .setDelegate(this)
}


/**
 * GET request with authentication.
 * @param {string} url
 * @return {Promise}
 * @protected
 */
Client.prototype._get = function (url) {
  var defer = Q.defer()
  var self = this
  var header = {
    'Content-Type': this.contentType
  }

  request.get(url, {
    auth: {user: self._token},
    headers: header
  }, defer.makeNodeResolver())
  return defer.promise
  .then(this._validateResponse.bind(this))
}


/**
 * PUT request with authentication.
 * @param {string} url
 * @param {Object} data
 * @param {Object} header
 * @param {String} query
 * @return {Promise}
 * @protected
 */
Client.prototype._put = function (url, data, header, query) {
  var defer = Q.defer()
  var self = this
  var header = header || {}
  header['Content-Type'] = this.contentType

  if (query) url += query
  
  request.put(url, {
    auth: {user: self._token},
    headers: header,
    json: data
  }, defer.makeNodeResolver())
  return defer.promise
  .then(this._validateResponse.bind(this))
}


/**
 * DELETE request with authentication.
 * @param {string} url
 * @param {String} query
 * @return {Promise}
 * @protected
 */
Client.prototype._del = function (url, query) {
  var defer = Q.defer()
  var self = this
  var header = {
    'Content-Type': this.contentType
  }

  if (query) url += query

  request.del(url, {
    auth: {user: self._token},
    headers: header
  }, defer.makeNodeResolver())
  return defer.promise
  .then(this._validateResponse.bind(this))
}


/**
 * Quote the provided string if not already quoted.
 * @param {string} str
 * @return {string}
 * @protected
 */
Client.prototype._quote = function (str) {
  if (str.charAt(0) == '"') return str
  return '"' + str + '"'
}


/**
 * Ensure valid response.
 * @param {Request} req
 * @return {(Request|Promise)}
 */
Client.prototype._validateResponse = function (res) {
  if (res.body) {
    try {
      res.body = JSON.parse(res.body)
    } catch (e) {}
  }

  if (!~[200, 201, 204].indexOf(res.statusCode))
    throw res

  return res
}


/**
 * Generates and formats api url.
 * @param {Array.<string>} path
 * @param {Object} query
 * @return {string}
 */
Client.prototype.generateApiUrl = function (path, query) {
  var href = Client.ApiEndPoint
  var pathname = ''

  for (var i = 0; i < path.length; i++)
    pathname += '/' + encodeURIComponent(path[i])

  // Remove undefined key-value pairs.
  if (query)
    Object.keys(query).forEach(function (key) {
      if (query[key] == undefined)
        delete query[key]
    })

  return url.format({
    protocol: 'https:',
    host: Client.ApiEndPoint,
    pathname: pathname,
    query: query
  })
}


// Module exports.
module.exports = Client
