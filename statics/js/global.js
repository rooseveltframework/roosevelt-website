// adds support for commandfor attribute https://developer.chrome.com/blog/command-and-commandfor
import { isSupported as invokersSupported, apply as invokersPolyfill } from 'invokers-polyfill/fn'

// this will stop the JS from executing if CSS is disabled or a CSS file fails to load; it will also remove any existing CSS from the DOM
require('check-if-css-is-disabled')()
window.addEventListener('cssDisabled', (event) => {
  // undo any DOM manipulations and then stop any further JS from executing
  document.body.classList.replace('js', 'no-js')
  throw new Error('A CSS file failed to load at some point during the app\'s usage. It is unsafe to execute any further JavaScript if the CSS has not loaded properly.')
})

// replace no-js class with js class which allows us to write css that targets non-js or js enabled users separately
document.body.classList.replace('no-js', 'js')

// add support for commandfor attribute if it is not natively supported
if (!invokersSupported()) invokersPolyfill()

// unhide nav button
// the nav button is hidden by default if js is disabled and revealed only if js is enabled
// if js is disabled and the user is on a small screen, the secondary nav in the footer is used exclusively
document.querySelectorAll('[commandfor]').forEach((el) => { el.removeAttribute('hidden') })

// activate semantic forms ui library js support https://github.com/rooseveltframework/semantic-forms
require('semantic-forms')()

// replace title attributes with tippy attributes
const tippy = require('tippy.js/dist/tippy.cjs.js').default // tippy ui tooltip library https://github.com/atomiks/tippyjs
document.querySelectorAll('[title]:not(iframe)')?.forEach(titleAttribute => { // apply tippy tooltip to any element with html title attribute
  if (!titleAttribute.getAttribute('data-tippy-skip')) {
    tippy(titleAttribute, {
      content: titleAttribute.getAttribute('title'), // extract tooltip content from html title attribute
      placement: titleAttribute.getAttribute('data-tippy-placement') || 'top' // allow html elements to customize tooltip placement
    })
    titleAttribute.removeAttribute('title') // remove html title attribute as it is now redundant and fights with tippy
  }
})

// display search box that does an advanced github search that displays only when js is enabled; this can only work when js is enabled because of how github search works
// TODO: augment search with roosevelt clientViews feature and search the template strings with some kind of client-side js-based fuzzy search library
document.querySelector('search').removeAttribute('hidden')
document.getElementById('searchForm').addEventListener('submit', (event) => {
  event.preventDefault()
  window.location = `https://github.com/search?q=org%3Arooseveltframework+language%3AMarkdown+${document.getElementById('search').value}&type=code`
})

// add light/dark mode picker
document.querySelector('dialog#nav')?.insertAdjacentHTML('beforeend', `<details id="theme">
  <summary>Theme</summary>
  <form class="semanticForms" class="${getCookie('theme') || 'light'}">
    <select id="mode-selector">
      <option value="os">OS preference</option>
      <option value="light"${getCookie('theme') === 'light' ? 'selected' : ''}>Light</option>
      <option value="dark"${getCookie('theme') === 'dark' ? 'selected' : ''}>Dark</option>
    </select>
  </form>
</details>`)
document.getElementById('mode-selector')?.addEventListener('change', setTheme)
function setTheme (event) {
  const cookieValue = getCookie('theme')
  const osPreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  window.theme = event?.target?.value || cookieValue || osPreference
  if (window.theme !== 'light' && window.theme !== 'dark') window.theme = osPreference
  if (event) setCookie('theme', event?.target?.value, 4015) // save the preference for 11 years
  if (window.theme === 'dark') {
    document.querySelector('html').classList.remove('light')
    document.querySelector('html').classList.add('dark')
    document.querySelector('link[href="/css/highlight.js.dark.css"]')?.remove()
    document.querySelector('link[href="/css/highlight.js.light.css"]')?.remove()
    document.querySelector('head').insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="/css/highlight.js.dark.css">')
  } else {
    document.querySelector('html').classList.remove('dark')
    document.querySelector('html').classList.add('light')
    document.querySelector('link[href="/css/highlight.js.dark.css"]')?.remove()
    document.querySelector('link[href="/css/highlight.js.light.css"]')?.remove()
    document.querySelector('head').insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="/css/highlight.js.light.css">')
  }
  document.querySelectorAll('form.semanticForms').forEach((form) => {
    form.classList.remove('light')
    form.classList.remove('dark')
    form.classList.add(window.theme)
  })
  // TODO: update teddy live demo iframe text color when the theme changes
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { setTheme() })
setTheme()

// cookie management utility functions
function getCookie (name) {
  const cookies = document.cookie.split('; ')
  for (const cookie of cookies) {
    const [key, value] = cookie.split('=')
    if (key === name) return value
  }
  return null
}
function setCookie (name, value, days) {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString()
  document.cookie = `${name}=${value}; expires=${expires}; path=/`
}
