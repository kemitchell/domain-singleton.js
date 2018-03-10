/* globals: window */
var assert = require('assert')
var cuid = require('cuid')
var debug = require('debug')
var pageBus = require('page-bus')

// Will hold a pageBus instance.
var bus

// The unique ID for this instance.
var OUR_INSTANCE_ID = cuid().slice(1)

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

  var BID_DELAY_INCREMENT = options.bidDelayIncrement || 100
  assert.equal(typeof BID_DELAY_INCREMENT, 'number')
  assert(BID_DELAY_INCREMENT >= 0)

  var INITIAL_BID_DELAY = options.initialBidDelay || (4 * BID_DELAY_INCREMENT)
  assert.equal(typeof INITIAL_BID_DELAY, 'number')
  assert(INITIAL_BID_DELAY >= 0)

  var CONFIRM_DELAY = options.confirmDelay || (4 * BID_DELAY_INCREMENT)
  assert.equal(typeof CONFIRM_DELAY, 'number')
  assert(CONFIRM_DELAY >= 0)

  var dom = options.window || window

  var log = debug('domain-singleton:' + task)
  if (!bus) bus = pageBus()

  dom.addEventListener('beforeunload', function () {
    emit({event: 'unloaded', id: OUR_INSTANCE_ID})
  })

  var loadedInstanceIDs = new Set()
  var leader = null
  // Timeout for sending a BID event.
  var bidTimeout = null
  // Timeout for confirming that our BID event was successful.
  var confirmTimeout = null

  bus.on(task, function (data) {
    assert(typeof data, 'object')

    var event = data.event
    assert(event)
    assert([LOADED, UNLOADED, BID].includes(event))

    var theirID = data.id
    assert.equal(typeof theirID, 'string')
    assert(theirID.length !== 0)

    // Do not process our own messages.
    if (theirID === OUR_INSTANCE_ID) return

    switch (event) {
    case LOADED:
      if (!loadedInstanceIDs.has(theirID)) {
        log('loaded: %o', theirID)
        loadedInstanceIDs.add(theirID)
        // If this instance is currently appointed,
        // broadcast that fact.
        if (leader === OUR_INSTANCE_ID) {
          emit({event: BID, id: OUR_INSTANCE_ID})
        }
        emit({event: LOADED, id: OUR_INSTANCE_ID})
      }
      break
    case UNLOADED:
      log('unloaded: %o', theirID)
      loadedInstanceIDs.delete(theirID)
      if (leader === theirID) {
        leader = null
        bidForAppointment()
      }
      break
    case BID:
      log('bid: %o', theirID)
      leader = theirID
      clearTimeout(bidTimeout)
      clearTimeout(confirmTimeout)
      break
    }
  })

  emit({event: LOADED, id: OUR_INSTANCE_ID})

  setTimeout(function () {
    if (leader === null) bidForAppointment()
  }, INITIAL_BID_DELAY)

  function emit (data) {
    log('sending: %o', data.event)
    bus.emit(task, data)
  }

  function bidForAppointment () {
    var bidDelay = bidPriority() * BID_DELAY_INCREMENT
    bidTimeout = setTimeout(function () {
      emit({event: BID, id: OUR_INSTANCE_ID})
      confirmTimeout = setTimeout(function () {
        leader = OUR_INSTANCE_ID
        log('confirmed')
        onAppointed()
      }, CONFIRM_DELAY)
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
