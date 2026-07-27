const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const TelegramBot = require("node-telegram-bot-api");

const {
    addonBuilder,
    getRouter
} = require("stremio-addon-sdk");



// =====================================
// MANIFEST
// =====================================

const manifest = {

    id: "com.rizultra.subtitle",

    version: "1.0.0",

    name: "Rizal Ultra Subtitle",

    description: "Malay Subtitle Addon",

    resources: [
        "subtitles"
    ],

    types: [
        "movie",
        "series"
    ],

    catalogs: [],

    idPrefixes: [
        "tt"
    ]

};



const builder = new addonBuilder(manifest);



// =====================================
// SUBTITLE HANDLER
// =====================================

builder.defineSubtitlesHandler(async (args) => {

    console.log("Subtitle Request:", args.id);

    const subtitles = [];

    const folder = path.join(__dirname, "subtitles");

    if (!fs.existsSync(folder)) {
        return { subtitles: [] };
    }

    const files = fs.readdirSync(folder);

    for (const file of files) {

        if (!file.endsWith(".srt"))
            continue;

        let clean = file
            .replace(".srt", "")
            .replace(".ms", "");

        // tt1234567_1_2
        // ->
        // tt1234567:1:2

        let fileID = clean.replace(/_/g, ":");

        if (
            args.id === fileID ||
            args.id.includes(fileID) ||
            fileID.includes(args.id)
        ) {

            subtitles.push({

                id: file,

                lang: "ms",

                url:
                    `${process.env.BASE_URL}/subtitles/${encodeURIComponent(file)}`

            });

            console.log("Matched:", file);

        }

    }

    return {

        subtitles

    };

});




// =====================================
// EXPRESS
// =====================================

const app = express();

app.use(cors());



// subtitle files

app.use(
    "/subtitles",
    express.static(
        path.join(__dirname, "subtitles")
    )
);



// stremio router

app.use(
    "/",
    getRouter(
        builder.getInterface()
    )
);


// =====================================
// TELEGRAM BOT
// =====================================

if(process.env.TELEGRAM_TOKEN){

    const bot = new TelegramBot(
        process.env.TELEGRAM_TOKEN,
        {
            polling:true
        }
    );


    bot.on("document", async (msg)=>{

        const file = msg.document;

        if(!file.file_name.endsWith(".srt")){
            
            bot.sendMessage(
                msg.chat.id,
                "❌ Hanya fail .srt diterima"
            );

            return;
        }


        const folder = path.join(
            __dirname,
            "subtitles"
        );


        if(!fs.existsSync(folder)){
            fs.mkdirSync(folder);
        }


        const fileLink =
        await bot.getFileLink(file.file_id);


        const https = require("https");


        const savePath =
        path.join(
            folder,
            file.file_name
        );


        const stream =
        fs.createWriteStream(savePath);


        https.get(
            fileLink,
            response=>{
                response.pipe(stream);

                stream.on(
                    "finish",
                    ()=>{
                        stream.close();

                        bot.sendMessage(
                            msg.chat.id,
                            "✅ Subtitle berjaya disimpan\n\n" +
                            file.file_name
                        );
                    }
                );
            }
        );

    });


    console.log(
        "Telegram Bot: ON"
    );

}
else{

    console.log(
        "Telegram Bot: TOKEN missing"
    );

}
// =====================================
// START
// =====================================

const PORT =
process.env.PORT || 7000;



app.listen(PORT, () => {

    console.log("===================================");

    console.log("Rizal Ultra Subtitle");

    console.log("Port :", PORT);

    console.log(
        "Manifest:",
        `http://localhost:${PORT}/manifest.json`
    );

    console.log("===================================");

});