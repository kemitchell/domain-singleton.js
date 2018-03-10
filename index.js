/* globals: window */
var assert = require('assert')
var cuid = require('cuid')
var debug = require('debug')
var pageBus = require('page-bus')

// Will hold a pageBus instance.
var bus

// The unique ID for this instance.
var OUR_INSTANCE_ID = cuid().slice(1)

// Delay used to calculate timeouts for bidding
// and confirming bids to appointment.
var BID_DELAY = 100

// Bus Event Types
var BID = 'bid'
var LOADED = 'loaded'
var UNLOADED = 'unloaded'

module.exports = function (options) {
  var task = options.task
  assert.equal(typeof task, 'string', 'options.task must be a string')
  assert(task.length > 0, 'options.task cannot be empty')

  var onAppointed = options.onAppointed
  assert.equal(typeof onAppointed, 'function', 'options.onAppointed must be a function')

  var dom = options.window || window

  var log = debug('domain-singleton:' + task)
  if (!bus) bus = pageBus()

  dom.addEventListener('beforeunload', function () {
    emit({event: 'unloaded', id: OUR_INSTANCE_ID})
  })

  var loadedInstanceIDs = new Set()
  var appointed = null
  // Timeout for sending a BID event.
  var bidTimeout = null
  // Timeout for confirming that our BID event was successful.
  var confirmTimeout = null

  bus
    .on(task, function (data) {
      assert(typeof data, 'object')

      var event = data.event
      assert(event)
      assert([LOADED, UNLOADED, BID].includes(event))

      var theirID = data.id
      assert.equal(typeof theirID, 'string')
      assert(theirID.length !== 0)

      // Do not process our own messages.
      if (theirID === OUR_INSTANCE_ID) return

      if (event === LOADED && theirID) {
        if (!loadedInstanceIDs.has(theirID)) {
          log('loaded: %o', theirID)
          loadedInstanceIDs.add(theirID)
          // If this instance is currently appointed,
          // broadcast that fact.
          if (appointed === OUR_INSTANCE_ID) {
            emit({event: BID, id: OUR_INSTANCE_ID})
          }
          emit({event: LOADED, id: OUR_INSTANCE_ID})
        }
      } else if (event === UNLOADED && theirID) {
        log('unloaded: %o', theirID)
        loadedInstanceIDs.delete(theirID)
        if (appointed === theirID) {
          appointed = null
          bidForAppointment()
        }
      } else if (event === BID) {
        log('bid: %o', theirID)
        appointed = theirID
        clearTimeout(bidTimeout)
        clearTimeout(confirmTimeout)
      }
    })

  emit({event: LOADED, id: OUR_INSTANCE_ID})

  bidForAppointment()

  function emit (data) {
    log('sending: %o', data.event)
    bus.emit(task, data)
  }

  function bidForAppointment () {
    var bidDelay = bidPriority() * BID_DELAY
    bidTimeout = setTimeout(function () {
      log('bidding')
      emit({event: BID, id: OUR_INSTANCE_ID})
      confirmTimeout = setTimeout(function () {
        appointed = OUR_INSTANCE_ID
        log('confirmed')
        onAppointed()
      }, BID_DELAY)
    }, bidDelay)
  }

  // Calculate the amount of time we should delay our bid,
  // based on the sort order of known instance IDs.
  function bidPriority () {
    var index = Array.from(loadedInstanceIDs)
      .sort()
      .indexOf(OUR_INSTANCE_ID)
    return index + 1
  }
}
