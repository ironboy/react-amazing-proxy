# react-amazing-proxy
The npm package **[react-amazing proxy](https://www.npmjs.com/package/react-amazing-proxy)** is an amazing proxy for use with **[create-react-app](create-react-app
)**. It:
* lets you use your own **api server**, together with React. development server on *one single port* (avoiding **[CORS problems](https://levelup.gitconnected.com/overview-of-proxy-server-and-how-we-use-them-in-react-bf67c062b929)**).
* handles **[Server Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)** and **[web sockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)** correctly.
* watches your backend api source code for changes.
* can be switched to serve your production build easily.

## Why is the built in proxy in create-react-app a problem?
The [built in proxy](https://create-react-app.dev/docs/proxying-api-requests-in-development) in **create-react-app** does not let **Server Sent Events** and **web sockets** through by default - and *[it is very problematic/impossible to get this to work](https://github.com/facebook/create-react-app/issues/3391)* even if you change its settings.

Here is a schematic of how it works. It opens a "hole" through the **react-dev-server** for whatever api routes you specify, so that requests can reach your **api server**: 

![Image description](https://raw.githubusercontent.com/ironboy/react-amazing-proxy/master/images/unamazing.gif)

This means you have *two* servers running but yours frontend code only talks to the **react-dev-server** that proxies the api routes to your  **api server**.


### Why does SSE and web sockets not work?
Unfortunately the built in proxy  buffers and compresses data in a way that makes **Server Sent Events** not work and it does not listen to the *protocol upgrade requests* a **web socket** needs to make in order to work.

### No built in strategy for switching to production
There is *no set strategy* for how to switch from development to production and serve a production build of your React app:
* Should you set up another proxying system for serving the production build? 
* Should you add an option in your **api server** to serve the static file from the build when in production?

Both solutions are possible, but there is no easy *"switch to production"* flag built in.

### No built in command for starting both servers at the same time
This is not a big issue, but you will have to start the **react-dev-server** and your **api-server** from separate windows in your terminal, or add an npm script using **[concurrently](https://www.npmjs.com/package/concurrently)**
 or a similar tool in order to start both servers with one command.

## How does react-amazing-proxy work?

React-amazing-proxy starts a server *devoted to one thing* - to be a really good proxy that can handle all types of requests including **Server Sent Events** and **web sockets**.

![Image description](https://raw.githubusercontent.com/ironboy/react-amazing-proxy/master/images/amazing.gif)

### npm start &ndash; all servers at once
It automatically starts up your **api server** and the **react-development-server**. You run *three* servers, but with on simple command - **npm start**.

### npm start build &ndash; build and serve
By writing **npm start build** you switch to *perform a production build* and serve this build instead of using the dev server. *It still proxies your **api server*** - thus no code versioning is needed on your server when you go to production.

### restarts your api server automatically on code changes
It automatically watches your  **api server** source code and restarts it on changes, much like **[nodemon](https://www.npmjs.com/package/nodemon)**.

## How do I install and use it?

### Installation

**Important:** **react-amazing-proxy** is meant for use in a **create-react-app** project so if you haven't done so already create your project:

```
npx create-react-app name-of-my-new-project
```

Then install **react-amazing-proxy**:


```
npm i react-amazing-proxy
```

A file called **proxy-settings.js** is created in your project root folder:

```js
module.exports = {
  // run react-dev-server (true) or serve build (false)
  dev: true,
  // whether to open the react site in a browser at start
  openInBrowser: true,
  // path to your own backend api
  // (set to empty string if yo don't have an internal JS-based api)
  pathToAPI: './api/index',
  // the host for your backend api 
  // set to another machine if your api is not local  
  hostForAPI: 'localhost',
  // the ports
  ports: {
    // where you want to run the 'joint' proxied server
    main: 3000,
    // where you want to run the react-dev-server
    react: 3456,
    // where you serve your api (make sure to serve it on that port)
    api: 3001
  },
  // a path to an optional script to run after builds
  postBuildScript: './postBuildScript.js',
  // a function that should return true if the backend-api 
  // is to handle the request (add your own logic here as needed)
  handleWithAPI(url) {
    return url.indexOf('/api/') === 0;
  }
};
```

### Basic setup
If you don't want to edit the settings you:
1. *Make sure* that a folder called **api** exists in your root folder and that it contains a **index.js**. (This should be the main file that that starts your **api server**.)
2. *Make sure* to start your **api server** on **port 3001**.
3. *Make sure* that the **api server** listens to routes that begin with **/api/**.

### Configure it to meet your needs
The **react-amazing-proxy** server is highly configurable. By changing the **proxy-settings.js** file you can: 
* make the server serve the production build by default.
* decide if it should open a browser window on start.
* change the path to where your **api server** is located
* change if the **api server** is located on another machine
* decide on which ports that should be used.
* add a post build script if you need to script changes to the build
* write your own logic for which routes that are proxied to your **api server**.

### Usage
**react-amazing-proxy** changes the **npm start** command, so now you can write:

* **npm start dev** - runs your *api server* and the *react-dev-server*.
* **npm start build** - performs a build, runs your *api server* and serves the build.
* **npm start** - looks at the **dev** property in *proxy-settings.js*. Behaves like *npm start dev* if this property is true and otherwise like *npm start build*.

### FAQ

#### 🙋I want to use [pm2](https://pm2.keymetrics.io/) to run my app (on a live server), how do I accomplish that?
🙂 That's simple. Add a **index.js** file at the root of your project with the following content:

```js
require('react-amazing-proxy')();
```

Run your project with pm2:
```
pm2 start index.js --name my-fine-app
```

This will run the build version, but you could change it to running the dev server (if you want to check debug output in pm2 logs):
```js
require('react-amazing-proxy')({ dev: true });
```
```
pm2 restart my-fine-app
```

#### 🙋 I am going to use react-amazing-proxy in an ongoing project where we previously used the built in proxy from create-react-app and/or nodemon and/or concurrently... what do have to think about?
🙂 Just *remove* all those partial fixes: Remove old proxies by *not* having a proxy setting in *package.json* and not having a *setupProxy.js*-file in *src*. Remove your own npm start scripts using *concurrently* (or similar tools). And you don't need *nodemon* to listen to changes to your backend server anymore. Think "clean as the day I created my project from *react-create-app"* and you've got it! 🙂

#### 🙋 What version of **react-amazing-proxy** should I use?
🙂 Always use the latest one, there are no breaking changes, but we are still fixing minor bugs. For example in version 1.0.58 we introduced: *gzip compressed serving of production builds and serving index.html on undefined routes during production*. **react-amazing-proxy** is always improving.

#### 🙋 My api server is not internal to the project and and/or not JS-based, what now?
🙂 No problem, just set **pathToAPI** to an empty string. **react-amazing-proxy** can still proxy to your api server, but you'll have to start it yourself.

#### 🙋My api server isn't even on the same machine, what now?
🙂 No problem, just set **pathToAPI** to an empty string and **hostForAPI** to the host (*ip* or *domain name*). **react-amazing-proxy** can still proxy to your api server, but you'll have to start it yourself.

(**Note for those with the API server on another machine**: We currently do not accept *https* as a protocol for reaching your **api server** - ask us if you need this functionality. This does not mean your whole app can not be behind a **https** "wall". Just that the communication between the proxy and the api server can't.)

#### 🙋How do I set up a live server with my project?
🙂 That's *outside the scope* of working with **react-amazing-proxy** - however, if you are developing using MERN (MongoDB, Express, React and Node.js) we would recommend a path of:
* Hiring a virtual server running Ubuntu or a similar Linux distro.
* Requiring a domain and pointing it to your server.
* Installing MongoDB, Node.js and Git and certbot on it.
* Obtaining a free SSL certificate for your domain from Let's Encrypt via certbot.
* Setting up a fronting reverse-proxy using nGinx or Node.js.
* Letting that fronting reverse-proxy take care of https encryption/decryption.
* Installing pm2.
* Starting your app in pm2 using **react-amazing-proxy** (as decribed in the first FAQ question).

The whole process is pretty straightforward and can be done in minutes, however if it is your first time expect it to take a couple of hours.

**Happy proxying!**
