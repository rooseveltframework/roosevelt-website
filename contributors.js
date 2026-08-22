(async () => {
  const axios = require('axios')
  const fs = require('fs')
  const path = require('path')
  const org = 'rooseveltframework'
  const cacheFile = path.join(__dirname, '.contributors-cache.json')
  const outputFile = path.join(__dirname, 'contributors.json')
  const repos = [
    'check-if-css-is-disabled',
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

  // a personal access token isn't required, but authenticated requests get 5000 requests per hour instead of 60
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
  const headers = {
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    'user-agent': 'roosevelt-website'
  }
  if (token) {
    headers.authorization = `Bearer ${token}`
    console.log('🧸  Fetching contributors using an authenticated GitHub API connection (5000 requests per hour)...')
  } else console.log('🧸  Fetching contributors using an unauthenticated GitHub API connection (60 requests per hour). Set the GITHUB_TOKEN environment variable to a GitHub personal access token to raise the limit to 5000 requests per hour...')

  // the contributors of a repo can't change unless the repo has been pushed to, so the last known push time of each repo is cached along with its contributors
  let cache = {}
  try {
    cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'))
  } catch { /* no cache yet: contributors will be fetched for every repo */ }

  let contributors = {}
  const newCache = {}
  let requests = 0
  let cacheHits = 0
  let rateLimitRemaining

  try {
    // one request lists every repo in the org along with when each was last pushed to, which is what makes it possible to skip most of the per repo requests below
    const pushTimes = {}
    for (const repo of await get(`https://api.github.com/orgs/${org}/repos?per_page=100`)) pushTimes[repo.name] = repo.pushed_at

    for (const repo of repos) {
      const pushedAt = pushTimes[repo]
      const cached = cache[repo]

      // nothing has been pushed to this repo since the last run, so its contributors are unchanged
      if (pushedAt && cached?.pushedAt === pushedAt) {
        newCache[repo] = cached
        Object.assign(contributors, cached.contributors)
        cacheHits++
        continue
      }

      const repoContributors = {}
      for (const contributor of await get(`https://api.github.com/repos/${org}/${repo}/contributors?per_page=100`)) {
        repoContributors[contributor.login] = {
          avatar_url: contributor.avatar_url,
          html_url: contributor.html_url
        }
      }

      // repos missing from the org listing (renamed, transferred, deleted, etc) have no push time to compare against next run, so they aren't cached
      if (pushedAt) newCache[repo] = { pushedAt, contributors: repoContributors }
      Object.assign(contributors, repoContributors)
    }
  } catch (err) {
    if ((err.response?.status === 403 || err.response?.status === 429) && err.response.headers['x-ratelimit-remaining'] === '0') {
      const reset = err.response.headers['x-ratelimit-reset']
      const resetsAt = reset ? new Date(Number(reset) * 1000).toLocaleTimeString() : 'an unknown time'
      console.error(`❌  Hit the GitHub API rate limit after ${requests} request(s). It resets at ${resetsAt}. Set the GITHUB_TOKEN environment variable to a GitHub personal access token to get a much higher rate limit.`)
    } else console.error(err.message || err)
    console.error(`❌  ${path.basename(outputFile)} was left unchanged.`)
    process.exitCode = 1
    return
  }

  contributors = Object.keys(contributors).sort().reduce((sorted, key) => {
    sorted[key] = contributors[key]
    return sorted
  }, {})
  fs.writeFileSync(outputFile, JSON.stringify(contributors, null, 2))
  fs.writeFileSync(cacheFile, JSON.stringify(newCache, null, 2))
  console.log(`🧸  Found ${Object.keys(contributors).length} contributors across ${repos.length} repos using ${requests} API request(s); ${cacheHits} repo(s) were unchanged since the last run${rateLimitRemaining === undefined ? '' : `; ${rateLimitRemaining} request(s) remain before hitting the rate limit`}.`)

  // fetches a github api url, following the link header to gather every page of results
  async function get (url) {
    const results = []
    while (url) {
      const res = await axios.get(url, { headers })
      requests++
      rateLimitRemaining = res.headers['x-ratelimit-remaining'] ?? rateLimitRemaining
      results.push(...res.data)
      url = (res.headers.link || '').split(',').map(entry => entry.match(/<([^>]+)>;\s*rel="next"/)).find(match => match)?.[1]
    }
    return results
  }
})()
