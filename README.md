appoint one page or frame on a domain to handle a task

```javascript
var domainSingleton = require('domain-singleton')

window.addEventListener('DOMContentLoaded', function () {
  domainSingleton({
    task: 'connect-to-peers',
    onAppointed: function () {
      document.body.innerHTML = 'Appointed'
      // ...
    }
  })
})
```

This package uses `require('assert')` assertions.  You may like to remove those statements from production bundles with a tool like [unassertify](https://www.npmjs.com/package/unassertify).

This package uses [debug](https://www.npmjs.com/package/debug) to log debugging messages.  You can enable logging with `localStorage.debug = 'domain-singleton:*'` or `localStorage.debug = 'domain-singleton:{task}'`, where `task` is the string passed as `options.task`.
