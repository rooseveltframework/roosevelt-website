(async () => {
  const axios = require('axios')
  const fs = require('fs')
  let contributors = {}
  try {
    const repos = [
      'check-if-CSS-is-disabled',
      'crossplatform-killport',
      'fallback-dependencies',
      'generator-roosevelt',
      'express-browser-reload',
      'express-html-validator',
      'mkroosevelt',
      'minify-html-attributes',
      'multi-db-driver',
      'node-php-runner',
      'progressively-enhance-web-components',
      'roosevelt',
      'roosevelt-logger',
      'roosevelt-sample-app',
      'roosevelt-website',
      'semantic-forms',
      'single-page-express',
      'source-configs',
      'teddy',
      'vscode-teddy'
    ]
    for (const repo of repos) {
      const res = await axios.get(`https://api.github.com/repos/rooseveltframework/${repo}/contributors`)
      for (const contributor of res.data) {
        contributors[contributor.login] = {
          avatar_url: contributor.avatar_url,
          html_url: contributor.html_url
        }
      }
    }
    contributors = Object.keys(contributors).sort().reduce((sorted, key) => {
      sorted[key] = contributors[key]
      return sorted
    }, {})
    fs.writeFileSync('./contributors.json', JSON.stringify(contributors, null, 2))
  } catch (err) {
    console.error(err)
  }
})()
