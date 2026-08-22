// this will stop the JS from executing if CSS is disabled or a CSS file fails to load; it will also remove any existing CSS from the DOM
require('check-if-css-is-disabled')()
window.addEventListener('cssDisabled', (event) => {
  // undo any DOM manipulations and then stop any further JS from executing
  document.body.classList.replace('js', 'no-js')
  throw new Error('A CSS file failed to load at some point during the app\'s usage. It is unsafe to execute any further JavaScript if the CSS has not loaded properly.')
})

// replace no-js class with js class which allows us to write css that targets non-js or js enabled users separately
document.body.classList.replace('no-js', 'js')

// unhide nav button
// the nav button is hidden by default if js is disabled and revealed only if js is enabled
// if js is disabled and the user is on a small screen, the secondary nav in the footer is used exclusively
document.querySelectorAll('[commandfor]').forEach((el) => { el.removeAttribute('hidden') })

// on wide screens the nav sits in a column that the layout stretches to the height of the page, so on a long page its links scroll away while the column stays behind as empty space
// once the links have gone, the nav button is floated over that space, which is what the .nav-scrolled-away class styles; the css only acts on it above the mobile breakpoint, so this does nothing on a small screen where the button is on screen anyway
// the element measured is the one holding the links, not the column around it, because the column itself never leaves the viewport
const navLinks = document.querySelector('dialog#nav')
// the nav button and the search field both live above the fold, so both are floated over the column once the links have gone; the css only acts on this class above the mobile breakpoint, where they are on screen anyway
const floatOnceNavScrolls = [document.querySelector('button[commandfor="nav"]'), document.querySelector('search'), document.getElementById('floating-scroll-to-top')].filter(Boolean)

// the column is sized to its widest link rather than to a set width, so the css that right aligns the floating controls inside it is told how wide it actually is
const navColumn = document.getElementById('pages')
if (navColumn) {
  const reportNavColumnWidth = () => document.documentElement.style.setProperty('--nav-column-width', `${navColumn.getBoundingClientRect().width}px`)
  window.addEventListener('resize', reportNavColumnWidth, { passive: true })
  reportNavColumnWidth()
}
// an observer rather than a scroll handler, so nothing is measured while the page is merely being scrolled through
if (navLinks && floatOnceNavScrolls.length && 'IntersectionObserver' in window) {
  new window.IntersectionObserver(([entry]) => {
    // the links have to have left the top of the viewport, not merely be absent from it: on a viewport too short to show them all they are still partly on screen the whole way down, and being cut off is not the same as having scrolled past
    const scrolledAway = !entry.isIntersecting && entry.boundingClientRect.bottom < 0
    for (const element of floatOnceNavScrolls) element.classList.toggle('nav-scrolled-away', scrolledAway)
  }).observe(navLinks)
}

// activate semantic forms ui library js support https://github.com/rooseveltframework/semantic-forms
require('semantic-forms')()

// display search box that does an advanced github search that displays only when js is enabled; this can only work when js is enabled because of how github search works
// TODO: update above comment
document.querySelector('search').removeAttribute('hidden')
document.querySelector('search').insertAdjacentHTML('beforeend', '<output hidden><ul></ul></output>')

// the search field and version picker drop onto their own line when the header runs out of room, which happens at one width on pages that have a version picker and at another on pages that do not, shifted again by however wide the scrollbar is
// css has no way to ask whether a flex item wrapped, so it is measured here and handed over as a class
// this has to come after the search field is revealed above, or the header would be measured while it is still a field narrower than it ends up
const pageHeader = document.querySelector('main > header')
const headerControls = pageHeader && pageHeader.querySelector('#nav-search-wrapper')
if (headerControls) {
  // the class only moves the line vertically, so it can never change the answer and set this oscillating
  const reportHeaderWrap = () => pageHeader.classList.toggle('controls-wrapped', headerControls.offsetTop > 0)
  window.addEventListener('resize', reportHeaderWrap, { passive: true })
  reportHeaderWrap()
}
document.getElementById('search').addEventListener('focus', performSearch)
document.getElementById('search').addEventListener('input', performSearch)
document.getElementById('searchForm').addEventListener('submit', (event) => {
  event.preventDefault()
})
document.getElementById('search').addEventListener('blur', (event) => {
  setTimeout(() => {
    document.querySelector('search output').setAttribute('hidden', 'hidden')
  }, 1000)
})
// the search index is fetched the first time the user shows interest in searching rather than on page load because most visitors never search and the index is much larger than the rest of the site's js combined
let searchIndex
function loadSearchIndex () {
  if (!searchIndex) {
    searchIndex = (async () => {
      const [currentPages, versionedPages] = await Promise.all([fetchSearchIndex('/js/search/latest.json'), fetchSearchIndex(versionedSearchIndexUrl())])

      // pages in an old version of the docs that are identical to their counterpart in the current docs are stored as pointers to that counterpart, so restore their text from it
      const currentPagesByFile = {}
      for (const page of currentPages) currentPagesByFile[page.file] = page
      const unchangedPages = new Set()
      for (const page of versionedPages) {
        if (!page.sameAs) continue
        page.text = currentPagesByFile[page.sameAs]?.text || ''
        unchangedPages.add(page.sameAs) // there's no reason to also list the current docs version of a page that hasn't changed since the version being viewed
      }

      // the version being viewed goes first so that its pages rank above the current docs in the results
      return [...versionedPages, ...currentPages.filter(page => !unchangedPages.has(page.file))]
    })()
  }
  return searchIndex
}

// if the current page is documentation for a specific version of a module, that version's slice of the search index is searched too; roosevelt's own docs are at /docs/[version] while the other modules' docs are at /docs/[repo-name]/[version]
function versionedSearchIndexUrl () {
  const match = window.location.pathname.match(/^\/docs\/(?:([^/]+)\/)?(\d+\.\d+\.\d+)(?:\/|$)/)
  if (!match) return null
  return `/js/search/${match[1] || 'roosevelt'}/${match[2]}.json`
}

// search is a progressive enhancement, so a slice of the index that can't be fetched is simply not searched rather than being treated as an error
async function fetchSearchIndex (url) {
  if (!url) return []
  try {
    const response = await window.fetch(url)
    if (!response.ok) return []
    return await response.json()
  } catch (error) {
    return []
  }
}

async function performSearch () {
  loadSearchIndex() // begin fetching the index as soon as the search box is focused so that it is ready by the time the user finishes typing
  const searchTerm = document.getElementById('search').value.toLowerCase().trim()
  document.querySelector('search output ul').innerHTML = ''
  if (searchTerm.replace(/\s/g, '').length) {
    const pages = await loadSearchIndex()

    // the user can keep typing while the index is being fetched, in which case a later call to this function renders the results for what they typed instead
    if (document.getElementById('search').value.toLowerCase().trim() !== searchTerm) return
    document.querySelector('search output ul').innerHTML = ''

    for (const file of pages) {
      if (file.text.toLowerCase().includes(searchTerm)) {
        // extract context around the search term
        const regex = new RegExp(`(.{0,30})(${searchTerm})(.{0,30})`, 'i') // match with up to n characters before and after
        const match = file.text.match(regex)
        let context = searchTerm
        if (match) {
          const before = match[1] || '' // up to n characters before the match
          const matchedText = match[2] // the matched search term
          const after = match[3] || '' // up to n characters after the match
          context = `${before}<strong>${matchedText}</strong>${after}` // highlight the matched term
        }

        document.querySelector('search output ul').insertAdjacentHTML('beforeend', `<li><a href="/${file.file}" title="${file.title}">…${context}…</li>`)
      }
    }
    document.querySelector('search output ul').insertAdjacentHTML('beforeend', `<li><a href="https://github.com/search?q=org%3Arooseveltframework+language%3AMarkdown+${document.getElementById('search').value}&type=code">Search this term on GitHub</li>`)
    // TODO: show/hide based on both focus and non-whitespace search term presence
    document.querySelector('search output').removeAttribute('hidden')
  } else {
    document.querySelector('search output').setAttribute('hidden', 'hidden')
  }
  enhanceTitleAttributes()
}

// add permalink icons to <h[n]> tags
document.querySelectorAll('div.content > article h1[id], div.content > article h2[id], div.content > article h3[id], div.content > article h4[id], div.content > article h5[id], div.content > article h6[id]').forEach((el) => {
  el.insertAdjacentHTML('beforeend', ` <small class="permalink"><a href="#${el.id}" class="no-underline" title="Permalink">🔗</a></small>`)
  el.addEventListener('mouseover', () => {
    el.querySelector('small').style.opacity = 1
  })
  el.addEventListener('mouseout', () => {
    el.querySelector('small').style.opacity = 0
  })
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
  // check for <source> elements and flip them if theme doesn't match OS pref
  if (osPreference !== window.theme) {
    document.querySelectorAll('[media^="(prefers-color-scheme"]').forEach((el) => {
      if (el.getAttribute('media').includes('dark')) el.setAttribute('media', '(prefers-color-scheme: light)')
      else el.setAttribute('media', '(prefers-color-scheme: dark)')
    })
  }
  document.querySelectorAll('.teddy-live-demo iframe').forEach((iframe) => {
    if (iframe.contentDocument) {
      const body = iframe.contentDocument.querySelector('body')
      body.style.color = window.theme === 'dark' ? 'white' : 'black'
    }
  })
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

// replace title attributes with tippy attributes
const tippy = require('tippy.js/dist/tippy.cjs.js').default // tippy ui tooltip library https://github.com/atomiks/tippyjs
function enhanceTitleAttributes () {
  document.querySelectorAll('[title]:not(iframe)')?.forEach(titleAttribute => { // apply tippy tooltip to any element with html title attribute
    if (!titleAttribute.getAttribute('data-tippy-skip')) {
      tippy(titleAttribute, {
        content: titleAttribute.getAttribute('title'), // extract tooltip content from html title attribute
        placement: titleAttribute.getAttribute('data-tippy-placement') || 'top' // allow html elements to customize tooltip placement
      })
      titleAttribute.removeAttribute('title') // remove html title attribute as it is now redundant and fights with tippy
    }
  })
}
enhanceTitleAttributes()
