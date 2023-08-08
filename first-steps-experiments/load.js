const fs = require('fs');
const tf = require('@tensorflow/tfjs-node');
const use = require('@tensorflow-models/universal-sentence-encoder');
const inputFilePath = 'plots.json';

const conn = new URL(process.env.PG_CONNECTION_STRING);
conn.search = "";

const config = {
    connectionString: conn.href,
    ssl: {
        rejectUnauthorized: true,
        ca: fs.readFileSync('./ca.pem').toString(),
    },
};

// Function to load JSON file and get the movie plots
function loadMoviePlots(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading the JSON file:', error);
        return [];
    }
}

const moviePlots = loadMoviePlots(inputFilePath);

const pgp = require('pg-promise')({
    /* initialization options */
    capSQL: true // capitalize all generated SQL
});
const db = pgp(config);

const storeInPG = (moviePlots) => {
    // set of columns
    const columns = new pgp.helpers.ColumnSet(['title', 'director', 'plot', 'year', 'wiki', 'cast', 'genre', 'embedding'], {table: 'movie_plots'});

    const values = [];
    for (let i = 0; i < moviePlots.length; i++) {
        values.push({title: moviePlots[i]['Title'], director: moviePlots[i]['Director'], plot: moviePlots[i]['Plot'], year: moviePlots[i]['Release Year'],  cast: moviePlots[i]['Cast'], genre: moviePlots[i]['Genre'], wiki: moviePlots[i]['Wiki Page'], embedding: `[${moviePlots[i]['embedding']}]`})
    }

    // generating a multi-row insert query:
    const query = pgp.helpers.insert(values, columns);

    // executing the query:
    db.none(query).then(res => console.log(res));
}

use.load().then(async model => {
    const batchSize = 100;
    for (let start = 0; start < moviePlots.length; start += batchSize) {
        const end = Math.min(start + batchSize, moviePlots.length);
        console.log(`Processed ${start} of ${moviePlots.length}.`);
        const plotDescriptions = moviePlots.slice(start, end).map(moviePlot => moviePlot.Plot);
        const embeddings = await model.embed(plotDescriptions);
        for (let i = start; i < end; i++) {
            const embeddingArray = embeddings.arraySync()[i - start];
            moviePlots[i]['embedding'] = embeddingArray;
        }
    }

    storeInPG(moviePlots)
});

