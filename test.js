var domainSingleton = require('./')
var pageBus = require('page-bus')

window.addEventListener('DOMContentLoaded', function () {
  domainSingleton({
    bus: pageBus()
    task: 'test',
    onAppointed: function () {
      document.body.innerHTML = 'Appointed'
    }
  })
  document.body.innerHTML = 'Not Appointed'
})
