// collapse secondary nav if js is enabled; it is the only nav when js is disabled on small screens, thus why it should be open by default
if (document.getElementById('secondary-nav')) document.querySelector('#secondary-nav details').removeAttribute('open')

// display version picker; it appears in the footer with js disabled; appears next to search bar when js disabled as a fancy form
if (document.getElementById('fancy-version-picker')) {
  document.getElementById('fancy-version-picker').addEventListener('change', async (event) => {
    let destination = event.target.value
    if (destination.includes('github.com')) {
      window.alert('Older versions of the documentation can be found by examining the GitHub repo history.')
      window.location = destination
    } else {
      const response = await fetch(destination, { method: 'HEAD' }) // perform a fetch request to check if the url exists
      console.log(response.ok)
      if (response.ok) console.log() // window.location = destination
      else {
        const parts = destination.split('/')
        parts.pop()
        parts.pop()
        destination = parts.join('/') + '/latest'
        window.location = destination
      }
    }
  })
  document.getElementById('fancy-version-picker').removeAttribute('hidden')
  document.getElementById('basic-version-picker').setAttribute('hidden', 'true')
}

// enable syntax highlighting
const hljs = require('highlight.js')
hljs.highlightAll()

// add copy code button to code blocks
document.querySelectorAll('pre code').forEach((codeBlock) => {
  codeBlock.insertAdjacentHTML('beforeend', '<form class="semanticForms"><button>Copy</button></form>')
  codeBlock.querySelector('button').addEventListener('click', (event) => {
    event.preventDefault()
    let textToCopy = codeBlock.textContent
    if (textToCopy.endsWith('Copy')) textToCopy = textToCopy.slice(0, -4)
    else if (textToCopy.endsWith('Copied!')) textToCopy = textToCopy.slice(0, -7)
    navigator.clipboard.writeText(textToCopy).then(() => {
      codeBlock.querySelector('button').textContent = 'Copied!'
      setTimeout(() => { codeBlock.querySelector('button').textContent = 'Copy' }, 2000)
    })
  })
})

// activate teddy live demo
const teddy = require('teddy/client')
const srcdocLayout = `<style>body { font-family: sans-serif; padding: 15px; color: ${window.theme === 'dark' ? '#fff;' : '#000;'} }</style><body>`
document.querySelectorAll('.teddy-live-demo').forEach((form) => {
  form.querySelector('output').innerHTML = ''
  form.querySelector('fieldset').appendChild(document.createElement('iframe'))
  form.querySelector('iframe').srcdoc = srcdocLayout + 'Click the "Render" button. Rendered template output will go here.' + '</body>'
  form.querySelector('menu button').addEventListener('click', (event) => {
    event.preventDefault()
    let json
    try {
      json = JSON.parse(form.querySelector('.model').value || '{}')
    } catch (e) {
      console.error(e)
      window.alert('Teddy could not parse your JSON data! Please ensure it is valid JSON data.')
    }
    try {
      teddy.setTemplate('live-demo', srcdocLayout + form.querySelector('.template').value + '</body>' || '')
      if (form.querySelector('.other-template')) teddy.setTemplate('other-template', form.querySelector('.other-template').value || '')
      form.querySelector('iframe').srcdoc = teddy.render('live-demo', json)
    } catch (e) {
      console.error(e)
      window.alert('Teddy could not render the template! Please ensure there are no typos.')
    }
  })
})
