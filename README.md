# react-amazing-proxy
The npm package **[react-amazing proxy](https://www.npmjs.com/package/react-amazing-proxy)** is an amazing proxy for use with **[create-react-app](create-react-app
)**. It:
* lets you use your own backend api, together with the react development server on one single port (avoiding [CORS problems](https://levelup.gitconnected.com/overview-of-proxy-server-and-how-we-use-them-in-react-bf67c062b929)).
* handles web sockets and Server Sent Events correctly,
* watches your backend api source code for changes
* can be switched to serve your production build easily.

## Why the built in proxy in create-react-app is a problem
The [built in proxy](https://create-react-app.dev/docs/proxying-api-requests-in-development) in **create-react-app** is bad does not let web socket and Server Sent Events calls through by default - and [it is very problematic/impossible to get this to work](https://github.com/facebook/create-react-app/issues/3391) even if you change its settings.

Here is a schematic of how it works. It opens a "hole" through the **react-dev-server** for whatever api routes you specify, so that request can reach your **api server**. 

This means you have *two* servers running but yours frontend code only talk to the **react-dev-server** that proxies the api routes to your  **api server**.

![Image description](https://raw.githubusercontent.com/ironboy/react-amazing-proxy/master/images/unamazing.gif)

#### Not good with SSE and web sockets
Unfortunately the built in proxy  buffers and compresses data in a way that makes SSE not work and it does not listen to the protocol upgrade requests a web socket needs to make in order to work.

#### No built in strategy for switching to production
Also there is no set strategy for how to switch from development to production and serve a production build of your React app:
* Should you set up another proxying system for serving the production build? 
* Should you add an option in your **api server** that serves the static file from the build?
* Either way: There is no simple "switch to production" flag...

#### No command for starting both servers at the same time
This is not a big issue, but you will have to start the **react-dev-server** and your **api-server** from separate windows in your terminal, or add a npm script using **[concurrently](https://www.npmjs.com/package/concurrently)**
 or a similar tool in order to start both servers with one command.

## How does react-amazing-proxy work?

React-amazing-proxy starts a server devoted to one thing - to be a really good proxy that can handle all types of request including Server Sent Events and web sockets.

![Image description](https://raw.githubusercontent.com/ironboy/react-amazing-proxy/master/images/amazing.gif)


It automatically starts up your **api server** and the **react-development-server**. You run *three* servers, but with on simple command - **npm start**.

You can switch it to perform a production-build and serve the production build instead, but still proxy your **api server** - thus no code versioning of your server is needed when going to production.

It automatically watches your source code for the **api server** and restarts in changes, much like **[nodemon](https://www.npmjs.com/package/nodemon)**.




