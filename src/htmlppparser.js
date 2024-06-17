// HTML++ parser
// real

async function parseHTMLPP(html, url, port){
    // strip HTML comments because they fuck with the system
    html = html.replaceAll(/(?=<!--)([\s\S]*?)-->/g, "")

    // first, we crawl for war crimes;

    //if(url.startsWith(`http://127.0.0.1`)) url = url.replace("http://127.0.0.1", "http://127.0.0.1:" + port)

    const goofy = ["meta", "link", "img", "input"];
    /*let lua = [`
local url = "example.com"
local output = fetch({
    url = "https://" .. url,
    method = "GET"
})
print(output.status)
--print(output.content)
local cards = get("card", true)
print(cards)`]*/

    let lua = [], meta = [], icon = "./bazinga.jpg", buss_links = [];

    while(true){
        if(typeof html == "string") html = html.split("");

        let atrocity = ``,
            sigma = false,
            watchingForMadlads = false,
            needsToRedo = false,
            entireTag = ``;

        for (let i = 0; i < html.length; i++) {
            const e = html[i];

            entireTag += e

            /*if(e == "=" && [
                html[i - 4],
                html[i - 3],
                html[i - 2],
                html[i - 1]
            ].join("") == "href"){
                let frfr = []
                "https://".split("").forEach((e, ii) => {
                    frfr.push(html[i + 2 + ii])
                });
                if(frfr.join("") != "https://") html[i + 1] += url;
            }
            if(e == "=" && [
                html[i - 3],
                html[i - 2],
                html[i - 1]
            ].join("") == "src"){
                let frfr = []
                "https://".split("").forEach((e, ii) => {
                    frfr.push(html[i + 2 + ii])
                });
                if(frfr.join("") != "https://") html[i + 1] += url;
            }*/
            // sigma

            let gyatt = async function(html){
                try{
                    if(atrocity == "meta"){
                        if (entireTag.includes("http-equiv=\"refresh\"")) {
                            const value = entireTag.split("content=\"")[1].split("\"")[0];
                            let [wait, url] = value.split(";url=");
                            if (!isNaN(wait) && url) {
                                await new Promise(r => setTimeout(r, parseInt(wait) * 1000));
                            };
                            return {
                                redirect: entireTag.split("url=")[1].split("\"")[0]
                            };
                        } else if (entireTag.includes("charset=\"")) {
                            meta.charset = entireTag.split("charset=\"")[1].split("\"")[0];
                        } else {
                            let name =
                                entireTag.includes("property=\"") ? entireTag.split("property=\"")[1].split("\"")[0] :
                                entireTag.split("name=\"")[1].split("\"")[0];
                            meta[name] = entireTag.split("content=\"")[1].split("\"")[0];
                        }
                    }
    
                    if(atrocity == "link" && entireTag.includes(`.css`)){
                        let href = entireTag.split("href=")[1].split("\"")[1];
                        let uri = new URI(href);
                        if(uri.is("relative")){
                            href = uri.absoluteTo(url);
                        };
    
                        let cssContent = await ffetch(href, {
                            responseType: http.ResponseType.Text
                        });
    
                        cssContent = parseCSSPP(cssContent.data)
    
                        html = html.join("").replace(`<${entireTag}</${atrocity}>`, "").split("")
    
                        html[html.length - 1] += `<style>${cssContent}</style>`
                    }else if(atrocity == "link"){
                        icon = entireTag.split("href=\"")[1].split("\"")[0];
                    }

                    if(atrocity == "script" && entireTag.includes(`.lua`)){
                        let href = entireTag.split("src=")[1].split("\"")[1];
                        let uri = new URI(href);
                        if(uri.is("relative")){
                            href = uri.absoluteTo(url);
                        }
    
                        let content = await ffetch(href, {
                            responseType: http.ResponseType.Text
                        });
                        
                        html = html.join("").replace(`<${entireTag}</${atrocity}>`, "").split("")
    
                        if(content.status == 200 && !lua.includes(content.data)) lua.push(content.data);
                    }

                    if (atrocity == "a" && entireTag.includes("href=\"") && entireTag.split("href=\"")[1]) {
                        let href = entireTag.split("href=\"")[1].split("\"")[0];
                        const uri = new URI(href);
                        if (uri.protocol() === "buss") {
                            console.log("buss:// URL found: ", href);
                            const id = crypto.randomUUID();
                            buss_links.push({id, href});
                            let html_removed = html.join("");
                            html_removed = html_removed.slice(0, i - entireTag.length) + "<" + entireTag.replace(`href="${href}"`, `data-bussinga-injected-link-id="${id}"`) + html_removed.slice(i + 1, html_removed.length);
                            html = html_removed.split("");
                        };
                    }
                }catch(e){
                    console.log(e)
                }

                return html;
            }

            if(watchingForMadlads && e == "/" && html[i + 1] == ">"){
                html[i + 1] += `</${atrocity}>`
                html.splice(i, 1)

                html = await gyatt(html);

                watchingForMadlads = false;
                sigma = false;
                atrocity = ``;
                needsToRedo = true;
                entireTag = ``;
                break;
            }
            if(watchingForMadlads && e == ">" && goofy.includes(atrocity) && html[i + 1] != "<" && html[i + 2] != "/"){
                html[i] += `</${atrocity}>`

                html = await gyatt(html);

                watchingForMadlads = false;
                sigma = false;
                atrocity = ``;
                needsToRedo = true;
                entireTag = ``;

                break;
            }else if(watchingForMadlads && e == ">"){
                html = await gyatt(html);

                watchingForMadlads = false;
                sigma = false;
                atrocity = ``;
                entireTag = ``;
                continue;
            }
            
            if(e == `<` && atrocity.length == 0 && !sigma){
                sigma = true;
                entireTag = ``;
                continue;
            }else if(e == `<`){
                html[i] = `! ! ! ! ${e} ! ! ! !`
                throw new Error(`You commited a HTML War Crime! Bussinga was unable to parse your HTML, so we put some exclaimation marks around it so you could find it\n${html.join("")}`)
            }

            if(!sigma) continue;

            if(atrocity.length == 0 && e == " ") continue;
            if(e == " ") { // whar
                sigma = false;
                watchingForMadlads = true;
                continue;
            };
            if(e == ">"){
                watchingForMadlads = false;
                sigma = false;
                atrocity = ``;
                continue;
            }

            atrocity += e;
        }

        html = html.filter((a)=>a).join("")

        if(!needsToRedo) {
            break;
        };
    }

    return {
        html: DOMPurify.sanitize(html),
        lua,
        title: html.match(new RegExp("<title>(.*?)</title>"))?.[1] || "website",
        meta,
        icon,
        buss_links
    };
}