# orchestrate.js [![Build Status](https://travis-ci.org/Bowery/orchestrate.js.png)](https://travis-ci.org/Bowery/orchestrate.js)

Node Driver for [Orchestrate.io](http://orchestrate.io).


# Installation

```
$ npm install orchestrate
```

# Running Tests
Currently, Orchestrate.js runs against the actual Orchestrate API. At the moment, there is no available local version to work with.

Ensure all dependencies are installed within the orchestrate director by running

```
$ npm install
```
To run tests:

```
$ npm test
```

# Creating a Client

```javascript
var db = require('orchestrate')(token)
```

# Running Queries

Orchestrate comes with support for GET/PUT/DEL for key-value queries, as well as search, graph, and events. Documentation can be found [here](https://docs.orchestrate.io/).

All queries are promise based. Just as a typical function would return a callback containing an error field followed by a result, orchestrate.js returns `then` and `fail` methods.

## Key-Value

To get a value:

```javascript
db.get('collection', 'key')
.then(function (result) {

})
.fail(function (err) {

})
```

To set a value:

```javascript
db.put('collection', 'key', {
  "name": "Steve Kaliski",
  "hometown": "New York, NY",
  "twitter": "@stevekaliski"
})
.then(function (result) {

})
.fail(function (err) {

})
```

Orchestrate also supports [conditional put statements](https://docs.orchestrate.io/#put-(create/update)) that determines whether or not the store operation will occur. `db.put` takes a fourth argument `match` which is either the `ref` value or `false`. If a ref value is provided an `update` will occur if there is a valid match, if false is provided, a `create` will occur if there is no match.

```javascript
db.put('collection', 'key', data, 'cbb48f9464612f20') // update
db.put('collection', 'key', data, false) // create
```

To remove a value:

```javascript
db.remove('collection', 'key', true)
.then(function (result) {
  
})
.fail(function (err) {
  
})
```

The last parameter is optional. If supplied the ref history will be removed as well.

## Search

To run a quick search, you can simply provide the collection you'd like to search within, and your query. Orchestrate supports any type of query including lucene queries.

```javascript
db.search('collection', 'query')
.then(function (result) {

})
.fail(function (err) {

})
```

If you want to include a limit or offset, the more verbose `SearchBuilder` is available:

```javascript
db.newSearchBuilder()
.collection('users')
.limit(100)
.offset(10)
.query('steve')
```

## Graphs
An awesome feature Orchestrate includes is the ability to generate graphs between collections. For example, consider the collections `users` and `movies`. Some user Steve will `like` a variety of movies. We can generate this relationship:

```javascript
db.newGraphBuilder()
.create()
.from('users', 'Steve')
.related('likes')
.to('movies', 'Superbad')
```

We can then look up all the different items Steve likes:
```javascript
db.newGraphReader()
.get()
.from('users', 'Steve')
.related('likes')
```

We can even take this another step further:
```javascript
db.newGraphReader()
.get()
.from('users', 'Steve')
.related('friends', 'likes')
```
This will return all of the things that friends of Steve have liked. This assumes a friend relation has previously been defined between Steve and another user.

If we want to delete a graph relationship:
```javascript
db.newGraphBuilder()
.remove()
.from('users', 'Steve')
.related('likes')
.to('movies', 'Superbad')
```

## Events
Events are time-ordered objects that exist with the context of a Key-Value object. Consider comments on a post or messages in a thread.

Creating an event:
```javascript
db.newEventBuilder()
.from('users', 'Steve')
.type('update')
.data({"text": "Hello!"})
```

Getting events:
```javascript
db.newEventReader()
.from('users', 'Steve')
.start(1384534722568)
.end(1384535726540)
.type('update')
```

## Removing a Collection

```javascript
db.deleteCollection('users')
```

