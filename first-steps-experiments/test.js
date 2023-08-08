const fs = require('fs');
const pg = require('pg');
const tf = require('@tensorflow/tfjs-node');
const use = require('@tensorflow-models/universal-sentence-encoder');

const conn = new URL(process.env.PG_CONNECTION_STRING);
conn.search = "";

const config = {
    connectionString: conn.href,
    ssl: {
        rejectUnauthorized: true,
        ca: fs.readFileSync('./ca.pem').toString(),
    },
};
const client = new pg.Client(config);

use.load().then(async model => {
    const embeddings = await model.embed("a lot of cute puppies");
    const embeddingArray = embeddings.arraySync()[0];
    console.log(JSON.stringify(embeddingArray));

    client.connect(function (err) {
        if (err)
            throw err;

        client.query("SELECT VERSION()", [], function (err, result) {
            if (err)
                throw err;

            console.log(result.rows[0].version);
            client.end(function (err) {
                if (err)
                    throw err;
            });
        });
    });

});







