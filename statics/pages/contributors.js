module.exports = () => {
  const contributors = require('contributors.json')

  // remove bots
  delete contributors['greenkeeper[bot]']
  delete contributors['renovate[bot]']
  delete contributors['renovate-bot']

  console.log(`🧸  Total contributors to the Roosevelt framework: ${Object.keys(contributors).length}`)
  return {
    contributors,
    totalContributors: Object.keys(contributors).length
  }
}
