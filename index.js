const fs = require('fs');
const cp = require('child_process');
const path = require('path');
const chokidar = require('chokidar');
const action = process.argv.slice(2)[0];

// Children
let apiServer;
let devServer;

// Logs
const chalk = require('chalk');
let lastFromDev;
let ignoreBuildToolForASecond = 0;
function log(...args) {
  let x = args.pop();
  if (x !== 'from-dev-server' && x !== 'from-build-tool') {
    args.push(x);
    console.log(chalk.black.bold('\nreact-amazing-proxy:'));
    if (x.includes('Bye now!')) { log = () => { } };
  }
  if (x === 'from-dev-server') {
    args[0] = args[0].trim();
    let org = args[0];
    args[0] = args[0].split(`:${ports.react}`).join(`:${ports.main}`);
    if (args[0] !== org) {
      openInBrowser && browserOpen();
    }
    !lastFromDev && console.log(chalk.black.bold('\nreact-dev-server:'));
    lastFromDev = true;
  }
  if (x === 'from-build-tool') {
    if (Date.now() - ignoreBuildToolForASecond < 1000) {
      return;
    }
    args[0] = args[0].trim();
    if (args[0].includes('The build folder is read')) {
      ignoreBuildToolForASecond = Date.now();
      args[0] = args[0].split('deployed.')[0] + 'deployed.\n';
      setTimeout(() => log('Serving the production build...'), 0);
      openInBrowser && browserOpen();
    }
    !lastFromDev && console.log(chalk.black.bold('\nreact-build-tool:'));
    lastFromDev = true;
  }
  console.log(chalk.blue.bold(...args));
}

// Calculate paths
const projectPath = action.includes('install') ?
  process.env.INIT_CWD : __dirname.split('node_modules')[0];
const settingsPath = path.resolve(projectPath, './proxy-settings.js');
const defaultSettingsPath = path.resolve(__dirname, './settings.js');
const reactStartScriptPath = path.resolve(projectPath, 'node_modules/react-scripts/scripts/start');
const reactBuildScriptPath = path.resolve(projectPath, 'node_modules/react-scripts/scripts/build');
const packageJsonPath = path.resolve(projectPath, './package.json');
const reactOpenBrowserPath = path.resolve(projectPath, 'node_modules/react-dev-utils/openBrowser');

// Create a settings file for the project if it doesn't exist
if (!fs.existsSync(settingsPath)) {
  fs.writeFileSync(
    settingsPath,
    fs.readFileSync(defaultSettingsPath, 'utf-8'), 'utf-8'
  );
}

// Add the correct npm start command to package.json if not done
let pjson = require(packageJsonPath);
function writeToPackageJson(correct) {
  if (typeof pjson === 'object') {
    pjson.scripts = pjson.scripts || {};
    if (pjson.scripts.start !== correct) {
      pjson.scripts.start = correct;
      fs.writeFileSync(
        packageJsonPath,
        JSON.stringify(pjson, null, '  ') + '\n',
        'utf-8'
      );
    }
  }
}
writeToPackageJson('node node_modules/magic/index');

// If postinstall exit now
if (action === 'postinstall') {
  log('Created a proxy-settings.js file\n' +
    'and updated the npm start command...\n');
  process.exit();
}

// If preuninstall
if (action === 'preuninstall') {
  writeToPackageJson('react-scripts start');
  log('Removed the proxy-settings.js file\n' +
    'and updated the npm start command...\n');
  fs.unlinkSync(settingsPath);
  process.exit();
}

// Read settings
const settings = Object.assign(require(defaultSettingsPath), require(settingsPath));
let { dev, ports, handleWithAPI, openInBrowser, pathToAPI } = settings;
pathToAPI = path.resolve(projectPath, pathToAPI);

// Override dev settings with command line argumenst dev and build
action === 'dev' && (dev = true);
action === 'build' && (dev = false);

// Require http module + http-proxy and create a proxy server
const http = require('http');
const httpProxy = require('http-proxy');
const proxy = httpProxy.createProxyServer();

// Setup a proxy
const reactProxy = new httpProxy.createProxyServer();

// Create the main server
const mainServer = http.createServer(function (req, res) {
  let port = handleWithAPI(req.url) ? ports.api : ports.react;
  reactProxy.web(req, res, { target: `http://localhost:${port}` });
});

// Make it able to handle socket requests
mainServer.on('upgrade', function (req, socket, head) {
  let port = handleWithAPI(req.url) ? ports.api : ports.react;
  proxy.ws(req, socket, head, { target: `ws://localhost:${port}` });
});

// Start the main server
log(`Starting the main server on port ${ports.main}`);
mainServer.listen(
  ports.main
);

// Start backend api server
// and restart on file changes in its directory
let chokiTimeout;
log('Starting the API server');
chokidar.watch(path.dirname(pathToAPI)).on('all', () => {
  clearTimeout(chokiTimeout);
  chokiTimeout = setTimeout(() => {
    apiServer && log('Restarting the API server');
    apiServer && apiServer.kill();
    apiServer = cp.fork(pathToAPI);
  }, 250);
});

// Start the react-dev-server or serve the production build using Express
if (dev) {
  // start the react server
  // log('Starting the react-dev-server...');
  devServer = cp.fork(reactStartScriptPath, {
    env: { PORT: ports.react + '', BROWSER: 'none' }, silent: true
  });
  devServer.stdout.on('data', (x) => log(x.toString(), 'from-dev-server'));
}
else {
  // run build script
  const buildTool = cp.fork(reactBuildScriptPath, { silent: true });
  buildTool.stdout.on('data', (x) => log(x.toString(), 'from-build-tool'));
  // serve the static react production build using express
  const express = require('express');
  const app = express();
  app.use(express.static('./build'));
  app.listen(ports.react);
}

// Open in browser
let openTimeout;
function browserOpen() {
  clearTimeout(openTimeout);
  openTimeout = setTimeout(
    () => openBrowser(`http://localhost:${ports.main}`),
    1000
  );
}

// Close child processes
function killChildren() {
  apiServer.kill();
  devServer && devServer.kill();
  log('Bye now!\n');
  process.exit();
}
process.on('SIGINT', killChildren);
process.on('exit', killChildren);

const openBrowser = require(reactOpenBrowserPath);