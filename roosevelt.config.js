const rooseveltConfig = require('roosevelt/config')

module.exports = {
  makeBuildArtifacts: 'staticsOnly',
  viewEngine: [
    'html:teddy'
  ],
  publicFolder: 'docs',
  html: {
    folderPerPage: 'index.html'
  },
  sitemap: {
    enable: true,
    baseUrl: 'https://rooseveltframework.org',
    file: true, // github pages serves the docs folder without roosevelt, so the sitemap and robots.txt are written into it
    staticPages: false // the pages to list are picked out by sitemapUrls in test-server.js, which leaves out the old versions of the docs and the redirect pages
  },
  css: {
    sourcePath: 'css',
    compiler: {
      enable: true,
      module: 'sass',
      options: {}
    },
    output: 'css',
    versionFile: null
  },
  js: {
    sourcePath: 'js',
    bundler: {
      enable: true,
      module: 'webpack'
    },
    bundles: [
      {
        config: {
          entry: rooseveltConfig.ref(param => `${param.js.sourcePath}/global.js`),
          output: {
            path: rooseveltConfig.ref(param => `${param.publicFolder}/js`),
            filename: 'global.js'
          },
          resolve: {
            alias: {
              fs: false,
              path: false
            },
            modules: [
              rooseveltConfig.ref(param => `${param.js.sourcePath}`),
              rooseveltConfig.ref(param => `${param.buildFolder}/js`),
              rooseveltConfig.ref(param => `${param.appDir}`),
              'node_modules'
            ]
          }
        }
      },
      {
        config: {
          entry: rooseveltConfig.ref(param => `${param.js.sourcePath}/main.js`),
          output: {
            path: rooseveltConfig.ref(param => `${param.publicFolder}/js`),
            filename: 'main.js'
          },
          resolve: {
            alias: {
              fs: false,
              path: false
            },
            modules: [
              rooseveltConfig.ref(param => `${param.js.sourcePath}`),
              rooseveltConfig.ref(param => `${param.buildFolder}/js`),
              rooseveltConfig.ref(param => `${param.appDir}`),
              'node_modules'
            ]
          }
        }
      },
      {
        config: {
          entry: 'node_modules/docs-semantic-forms/docs/statics/js/semantic-forms-main.js',
          output: {
            path: rooseveltConfig.ref(param => `${param.publicFolder}/js`),
            filename: 'semantic-forms-main.js'
          },
          resolve: {
            alias: {
              fs: false,
              path: false,
              'semantic-forms$': rooseveltConfig.ref(param => `${param.appDir}/node_modules/semantic-forms/dist/semantic-forms.cjs`)
            },
            modules: [
              rooseveltConfig.ref(param => `${param.js.sourcePath}`),
              rooseveltConfig.ref(param => `${param.buildFolder}/js`),
              rooseveltConfig.ref(param => `${param.appDir}`),
              'node_modules',
              'node_modules/docs-semantic-forms/docs/statics/js'
            ]
          }
        }
      }
    ]
  },
  copy: [
    {
      source: rooseveltConfig.ref(param => `${param.staticsRoot}/images`),
      dest: rooseveltConfig.ref(param => `${param.publicFolder}/images`)
    },
    {
      // copied rather than given to the sitemap's robotsTxt param, because roosevelt only writes a robots.txt into the public folder when there is none there yet, so later edits to the source would never reach it
      source: rooseveltConfig.ref(param => `${param.staticsRoot}/robots.txt`),
      dest: rooseveltConfig.ref(param => `${param.publicFolder}/robots.txt`)
    }
  ]
}
