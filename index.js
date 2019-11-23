
module.exports = (settings) => {
  if (typeof settings !== 'object') { settings = {}; }
  global.__reactAmazingProxySettings = settings;
  require('./start');
}