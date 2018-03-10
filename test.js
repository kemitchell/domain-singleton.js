var domainSingleton = require('./')

window.addEventListener('DOMContentLoaded', function () {
  domainSingleton({
    task: 'test',
    onAppointed: function () {
      document.body.innerHTML = 'Appointed'
    }
  })
  document.body.innerHTML = 'Not Appointed'
})
