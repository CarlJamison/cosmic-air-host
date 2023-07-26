const express = require('express');
const app = express();
const { compress, decompress } = require('shrink-string')
const server = require('http').Server(app);
const { minify } = require('html-minifier-terser');
const bodyParser = require('body-parser');
const port = process.env.PORT || 80;
app.use(bodyParser.text());
app.use(express.static(__dirname + '/public'));

app.get('/h/:query', async (req, res) => {
    var base64 = "H4sIAAAAAAAAC" + req.params.query;
    handleDecompression(base64, res);
});

app.get('/:query', async (req, res) => {
    handleDecompression(req.params.query, res);
});

async function handleDecompression(base64, res){
    if(!base64 || !base64.length){
        res.status(403).send('Empty query')
    }else{
        try {
            var html = await decompress(base64);
            html = hydrate(html);
            res.send(html);
        } catch (error) {
            res.status(403).send('Invalid html')
        }
    }
}

app.post('/', async (req, res) => {
    let text = req.body;
    try{
        console.log("Original: " + text.length)
        text = await minify(text, {
            removeAttributeQuotes: true,
            collapseWhitespace: true,
            minifyCSS: true,
            minifyJS: {
                compress: {
                    arguments: true,
                    booleans_as_integers: true,
                    ecma: 2015,
                    pure_getters: true,
                    //toplevel: true,
                    passes: 3
                },
                //toplevel: true
            },
            minifyURLs: true,
            removeRedundantAttributes: true,
            collapseBooleanAttributes: true,
            collapseInlineTagWhitespace: true,
            removeStyleLinkTypeAttributes: true,
            removeScriptTypeAttributes: true,
            removeComments: true,
            removeEmptyAttributes: true,
            removeOptionalTags: true,
            //removeEmptyElements: true,
            sortClassName: true,
            sortAttributes: true,
            //includeAutoGeneratedTags: false,
            useShortDoctype: true
        });
        console.log("Post-minimization: " + text.length);

        var dehydrated = dehydrate(text);
        console.log("Post-dehydration: " + dehydrated.length);

        var compressed = await compress(dehydrated);
        console.log("Post-compression: " + compressed.length + " (without dehydration: " + (await compress(text)).length + ")");

        res.send(compressed
            .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_").replace("H4sIAAAAAAAAC", "h/"));
    }catch{
        res.status(400).send("Invalid html");
    }
})

var tokens = "1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+-=[];',./`{}|:<>?~"
var templates = ["|", "<meta content=\"width=device-width,initial-scale=1\" name=viewport>", "rel=stylesheet>", 
"background", "margin", "padding", "</button>", "<button ", "button", "onclick=", "index", "Math.PI", "</title>",
"color:", "class=", "</div>", "<div", "</script>", "setInterval(", ".clearRect", ".lineWidth", "let ",
"script", "box-shadow", "<h1>", "family", "Math.floor(", "Math.random(", "Math.", ".filter(", "return", ".length",
"style", "title", "https://", "header", "-size:", "</body>", "body", "border", "height", "font-", "gradient", "width",
"<meta charset=", "<meta ", "<link ", "src=\"", "href=", "content=", "name=", "display", "position", "window.", "</h1>",
"left", "right", "top", "bottom", "100%", "font", ".com", "console.log(", "function", "document.getElementById(",
"for(var i=0;i<", "random", ".fill", "var ", "const ", "find", "canvas", "Date.now()", "floor(", "for(", "forEach(",
";i++)", "inner", "getContext(", "null", "<html lang=en>", ".strokeStyle", ".beginPath()", ".stroke()"]

function hydrate(html){

    for(var i = templates.length - 1; i >= 0; i--){
        html = html.replaceAll(`|${tokens[i]}`, templates[i]);
    }
    
    return "<!doctype html>" + html;
}

function dehydrate(html){
    for(var i = 0; i < templates.length; i++){
        html = html.replaceAll(templates[i], `|${tokens[i]}`)
    }
    //console.log(html)    
    //console.log(templates.length + "/" + tokens.length)
    return html.replace("<!doctype html>", "");
}

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
