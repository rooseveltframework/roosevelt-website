module.exports = (app) => {
  let model = require('models/global')(app)
  model.hello = 'world'
  return model
}
