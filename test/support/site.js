const fs = require('fs')
const path = require('path')

const docsDir = path.join(__dirname, '..', '..', 'docs')

// these tests check the site that was built rather than building one themselves: a build writes into docs/, which is the
// committed output of this repo, so a test that built its own copy would either dirty the working tree or have to undo
// itself afterwards
// `npm test` does a production build first, so what gets checked is the site as it ships
function builtSite () {
  if (!fs.existsSync(path.join(docsDir, 'index.html'))) {
    throw new Error('docs/index.html is missing, so there is no built site to check. Run `npm test`, which builds it first, or `npm run build` on its own.')
  }
  return docsDir
}

// every html file in the built site, as paths relative to docs/ using forward slashes, the way a url would be written
function pages () {
  return fs.readdirSync(docsDir, { recursive: true })
    .map(file => file.split(path.sep).join('/'))
    .filter(file => file.endsWith('.html'))
}

function read (file) {
  return fs.readFileSync(path.join(docsDir, file), 'utf8')
}

module.exports = { docsDir, builtSite, pages, read }
