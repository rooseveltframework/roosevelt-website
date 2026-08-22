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
    }
  ]
}
