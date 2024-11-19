const INTERNAL_PAGES_SOURCE = "https://raw.githubusercontent.com/webx-plus/internalPages/main";
const INTERNAL_PAGES = ["settings", "welcome", "update", "history"];
let THEME;

let open_tabs = JSON.parse(localStorage.getItem(`tabs`) || `[]`);

window.dnsCache = {}

if(!localStorage.getItem(`dns`)) localStorage.setItem(`dns`, `https://dns.webxplus.org/resolve`);
if(!localStorage.getItem(`newTabPage`)) localStorage.setItem(`newTabPage`, `buss://search.frontdoor`);
if(!localStorage.getItem(`global_history`)) localStorage.setItem(`global_history`, `[]`);

// Init window whatever
let http;
if (typeof __TAURI__ !== "undefined") {
  const appWindow = __TAURI__.window.appWindow;
  http = __TAURI__.http;

  window.http = http;
  window.ffetch = http.fetch;
  
  document
    .getElementById('titlebar-minimize')
    .addEventListener('click', () => appWindow.minimize())
  document
    .getElementById('titlebar-maximize')
    .addEventListener('click', () => appWindow.toggleMaximize())
  document
    .getElementById('titlebar-close')
    .addEventListener('click', () => appWindow.close());

  function isFullScreen(){
    return appWindow.isMaximized() || appWindow.isFullScreen();
  }

  window.addEventListener(`resize`, ()=>{
    setTimeout(async()=>{
      if(await isFullScreen()){
        document.getElementById(`fullScreenIcon`).className = "bx bx-exit-fullscreen"
      }else document.getElementById(`fullScreenIcon`).className = "bx bx-fullscreen"
    },10)
  })
} else {
  http = {
    fetch: async(uri, options) => {
      //hope this works
      //im sorry if you have to debug it
      const request = await fetch(uri, options);
      let result;
      if (options && options.responseType === 2) {
        const clone = request.clone();
        result = await request.json().catch(() => clone.text());
      } else {
        result = await request.text();
      };
      return {
        data: result,
        headers: request.headers,
        ok: request.ok,
        status: request.status,
        url: request.url,
      }
    },
    ResponseType: {
      "Text": 1,
      "JSON": 2,
      "Binary": 3
    }
  };
  window.http = http;
  window.ffetch = http.fetch;
  document.querySelector(".rightActions").remove();
};

// Init themes
let themeConfig;
async function paintTheme(reloadAll = true){
  if(!localStorage.getItem("theme")) localStorage.setItem("theme", "classic");
  THEME = localStorage.getItem("theme")

  themeConfig = window.themes[THEME]
  window.themeConfig = themeConfig;

  document.documentElement.style = ``
  for (const key in themeConfig) {
    document.documentElement.style.setProperty('--' + key, themeConfig[key])
  }

  if(!reloadAll) return;
  ;[...document.querySelectorAll(`iframe`)].reverse().forEach((i)=>{
    i.c.refresh();
  })
}
paintTheme(false);
window.paintTheme = paintTheme;

// alright actual website stuff now
function getRawGithubUrl(githubUrl) {
  // Extract username and repo name from the URL
  const [username, repoName] = githubUrl.replace(`https://github.com/`, ``).split("/");

  // Return the transformed URL for raw content
  return `https://raw.githubusercontent.com/${username}/${repoName}/refs/heads/main/index.html`;
}

function traverse(o,func) {
  for (var i in o) {
      func.apply(this,[i,o[i]]);  
      if (o[i] !== null && typeof(o[i])=="object") {
          //going one step down in the object tree!!
          traverse(o[i],func);
      }
  }
}

window.currentTabID = 0;
window.tabs = []

class dnsLooker {
  constructor(url){
    this.url = url;
  }

  lookup(siteName, tld){
    return new Promise((resolve, reject)=>{
      ffetch(`${this.url}/${siteName}/${tld}`, {
        responseType: http.ResponseType.JSON
      }).then((r)=>{
        switch(r.status){
          case 200:
          case 304:
            resolve(r.data)
            break;
          case 404:
            reject({
              title: `Not Found`,
              text: `${siteName}.${tld} doesn't exist.`
            })
            break;
          default:
            reject({
              title: `DNS Error`,
              text: `Returned ${r.status}, body ${r.data}`
            })
            break;
        }
      }).catch((e)=>{
        console.error(e)
        reject({
          title: `Internal DNS Error`,
          text: e
        })
      })
    })
  }
};
class site {
  constructor(url, id){
    this.historyPosition = 0;
    this.history = [];

    this.iframe = document.createElement(`iframe`)
    this.iframe.setAttribute(`sandbox`, `allow-same-origin allow-scripts allow-top-navigation-to-custom-protocols allow-popups allow-top-navigation`)

    const tabID = ++currentTabID

    this.tabID = tabID
    this.iframe.c = this;
    this.iframe.style.display = "none"

    this.iframe.setAttribute(`tabID`, tabID)
    tabs.push(tabID)

    document.querySelector(`#contents`).appendChild(this.iframe);

    this.navigateID = 0;
    this.navigate(url);
  }
  navigate(url, dontaddtohistory = false){
    let thisNavigateID = ++this.navigateID;

    this.iframe.contentWindow.document.close();
    this.iframe.setAttribute(`title`, "bussinga!")
    this.iframe.setAttribute(`image`, "")
    this.iframe.setAttribute(`location`, url)

    uiRefresh();
    if(selectedTab == this.tabID) document.querySelector(`#search`).value = url;

    if(!url) return;

    // Get info about the domain
    this.urlParsed = new URI(url)
    this.tld = this.urlParsed.tld();
    this.siteName = this.urlParsed.hostname().split(".").slice(0,-1).join(".");
    this.protocol = this.urlParsed.protocol();
    this.path = this.urlParsed.pathname();

    // Init page
    this.doc = this.iframe.contentWindow.document;
    this.doc.open();

    // Init LUA
    this.lua = new luaEngine(this.iframe, url, Object.fromEntries(new URLSearchParams(this.urlParsed.search())))

    // after DNS lookup
    let finishUp = ()=>{
      this.doc = this.iframe.contentWindow.document;

      const injectedElement = document.createElement(`style`);
      injectedElement.innerHTML = `
        /* injected by bussinga */
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,100..900;1,100..900&family=Varela+Round&display=swap');
        *{box-sizing: border-box;}
        .query{height:fit-content !important}
        img{
          width: fit-content;
        }
        body {

          gap: 10;
          background-color: ${themeConfig["background"]};
          color: ${themeConfig["text1"]};
          direction: column;
          align-items: fill;
          width:100vw;
          height:100vh;
          font-family: ${themeConfig["font"]};
          padding: 12px;
          margin: 0;
        }
        h1 {font-size: 32px;}
        h2 {font-size: 28px;}
        h3 {font-size: 26px;}
        h4 {font-size: 24px;}
        h5 {font-size: 20px;}
        h6 {font-size: 18px;}

        a {
          border: none;
          color: ${themeConfig["link"]};
          text-decoration: underline;
        }

        input, button, select, option {
          background-color: ${themeConfig["button"]};
          font-family: ${themeConfig["font"]};
          color: ${themeConfig["text1"]};
          padding: 5px;
          border-color: #616161;
          border-width: 1px;
          border-style: solid;
          border-radius: 8px;
        }

        button:hover {
          background-color: ${themeConfig["highlight"]};
          transition: 0.2s;
        }
        hr {
          border: none;
          border-bottom: 1px solid ${themeConfig["text1"]};
          width: 100%;
        }

        textarea {
          padding: 5px;
          border-color: #616161;
          border-width: 1px;
          border-style: solid;
          border-radius: 12px;

          width: 400px;
          height: 100px;
        }
      `,
      this.doc.head.prepend(injectedElement);

      if(!this.doc.body.firstChild.tagName){
        this.doc.body.firstChild.remove();
      }

      this.iframe.contentWindow.addEventListener(`click`, (e)=>{
        if (!e.target.href) return;
        e.preventDefault();
        const href = e.target.getAttribute("href");
        const link = e.target;
        if(href?.startsWith("http://") || href?.startsWith("https://")) return window.open(href);
        const protocol = href.includes("://") ? href.split("://")[0] : this.protocol;
        const uri = new URI(href);
        let destination = uri;
        if(uri.is("relative")){
          destination = uri.absoluteTo(this.urlParsed.toString());
          console.log(destination);
      };
        if (link.getAttribute("target") == "_blank") return new site(destination.toString());
        this.navigate(destination.toString());
      });

      if (!dontaddtohistory) {
        const global_history = JSON.parse(localStorage.getItem("global_history") || `[]`);
        localStorage.setItem("global_history", JSON.stringify([...global_history, {url, name: this.iframe.getAttribute("title"), date: new Date().getTime()}]));
        this.history = this.history.slice(0, this.historyPosition + 1);
        this.history.push(url);
        this.historyPosition = this.history.length - 1;
      };

      uiRefresh();
    }

    let showError = (e)=>{
      if(this.navigateID != thisNavigateID) return;

      this.doc.write(`<style>
        body{
            padding: 32px;
        }
    </style>
    <title>Error</title>
    
    <h1>${e.title}</h1>
    <p>${String(e.text).replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;')}</p>`)

      finishUp();
      uiRefresh();
    }

    // DNS lookup
    console.log(`DNS lookup...`)

    this.iframe.setAttribute(`title`, `DNS lookup...`)
    uiRefresh()

    ;(async()=>{
      let IP;

      try{
        IP = await window.domains.lookup(this.siteName, this.tld, this.protocol);
        IP = IP.ip;
      }catch{
        showError({
          title: `Not Found`,
          text: `${url} doesn't exist`
        })
        return;
      }

      if (!IP.startsWith(`http://`) && !IP.startsWith(`https://`)) IP = `https://${IP}`;
      if(IP.startsWith(`https://github.com/`)){
        IP = getRawGithubUrl(IP)
      }

      console.log(`DNS lookup done`)

      this.iframe.setAttribute(`title`, "Loading...")
      uiRefresh();
      let url_path = this.protocol == "bussinga" ? "" : `${this.path}${this.path.endsWith(".html") || this.path.endsWith(".htm") ? "" : this.path.endsWith("/") ? "index.html" : "/index.html"}`;
      ffetch(`${IP}${url_path}${this.urlParsed.search()}${this.urlParsed.hash()}`, {
        method: "GET",
        responseType: 2
      }).then(async (r)=>{
        if (r.status == 404) {
          showError({
            title: "Not Found",
            text: `The page ${url_path} was not found on ${IP}. Please make sure the URL is correct and try again.`
          })
        } else if (r.status !== 200) {
          showError({
            title: "Website error",
            text: `The WebX site you're navigating to returned a ${r.status} status. This is simply unacceptable, thus I refuse to render it.`
          })
        }
        if(this.navigateID != thisNavigateID) return;
        
        console.log(`Website fetch done...`)
        try{
          let parsedIP = new URI(IP + "/"),
            parsed = await parseHTMLPP(r.data, `${IP}${url_path}`, parsedIP.port());
          
          this.doc.write(parsed.html);

          parsed.buss_links.forEach(x => {
            const tag = this.doc.querySelector(`[data-bussinga-injected-link-id="${x.id}"]`);
            tag.setAttribute(`href`, x.href);
            tag.removeAttribute(`data-bussinga-injected-link-id`);
          })

          this.iframe.setAttribute(`title`, parsed.title)
          this.iframe.setAttribute(`image`, parsed.icon)

          finishUp();

          parsed.lua.forEach((l)=>{
            this.lua.run(l)
          })

          uiRefresh();
        }catch(e){
          showError({
            title: "HTML parsing error",
            text: e
          })
        }
      }).catch(e => {

      });
    })()
  }
  refresh(){
    this.navigate(this.iframe.getAttribute(`location`), true);
  }
  close(){
    try{
      window.tabs = window.tabs.filter((i) => i != this.tabID);
      this.iframe.remove();
      uiRefresh();

    }catch(e){
      console.log(e)
    }
  }
  goBack() {
    console.log(this.historyPosition)
    console.log(this.history)
    if (this.historyPosition <= 0) return;
    this.historyPosition--;
    this.navigate(this.history[this.historyPosition], true);
  }
  goForward() {
    if (this.historyPosition >= this.history.length - 1) return;
    this.historyPosition++;
    this.navigate(this.history[this.historyPosition], true);
  }
};


window.site = site;
window.dnsLooker = dnsLooker;
window.dnsProviders = {
  "bussinga": {
    lookup: (domain, tld)=>{
      return new Promise((res,rej)=>{
        if(tld != "bang" || !INTERNAL_PAGES.includes(domain)) rej();
        res({
          ip: `${INTERNAL_PAGES_SOURCE}/${domain}.html`
        })
      })
    }
  },
  "localhost": {
    lookup: (domain, tld)=>{
      return new Promise((res,rej)=>{
        res({
          ip: `http://127.0.0.1:${domain}`
        })
      })
    }
  },
  "buss": new dnsLooker(localStorage.getItem(`dns`))
};
window.domains = {
  lookup: (domain, tld, protocol)=>{
    if(!isNaN(Number(tld)) && protocol == "localhost") domain = tld;

    return new Promise((res, rej)=>{
      if(window.dnsCache[`${domain}|.|${tld}|.|${protocol}`]){
        res(window.dnsCache[`${domain}|.|${tld}|.|${protocol}`]);
      }

      if(dnsProviders[protocol]){
        dnsProviders[protocol].lookup(domain, tld).then((r)=>{
          window.dnsCache[`${domain}|.|${tld}|.|${protocol}`] = r;
          res(r)
        }).catch(rej);
      }
      else rej();
    })
  }
}

// uiRefresh();

//Load previous tabs
if (open_tabs.length > 0) {
  for (const tab of open_tabs.reverse()) {
    new site(tab);
  }
} else {
  new site("bussinga://welcome.bang");
}

uiRefresh();


//new site("buss://dnssearch.uwu")
//new site("buss://yap.yap?dingle=it")
//new site("buss://minesweeper.lol")
//new site("buss://blackjack.lol")
//new site("bussinga://welcome")
