require('dotenv').config();
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
    client.connect(function (err) {
        if (err)
            throw err;

        client.query(`SELECT * FROM movie_plots ORDER BY embedding <-> '${JSON.stringify(embeddingArray)}' LIMIT 5;`, [], function (err, result) {
            if (err)
                throw err;

            console.log(result.rows);
            client.end(function (err) {
                if (err)
                    throw err;
            });
        });
    });

});







