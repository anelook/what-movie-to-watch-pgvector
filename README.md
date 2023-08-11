# Movie recommender using Tensorflow, Postgres, PGVector, vector search and Next.js. Step by step concise guide.

Here you'll find the instructions to build a movie recommendation system. Each step has a corresponding video showing in
detail what needs to be done.

## Step 1. Creating Vector Embeddings: Tensorflow universal-sentence-encoder and Node.js
[Video for Step 1](TODO)

### Get the dataset in JSON format

[Download the dataset](TODO).

### Add dependencies

Install dependencies for Tensorflow. Make sure that you path does not include spaces or weird characters (`tfjs-node` is
very picky):

```bash
npm install @tensorflow-models/universal-sentence-encoder --save
```
```bash
npm install @tensorflow/tfjs-node --save
```

Order is important, otherwise you might have to deal with peer-dependencies issue.

### Add encoder

Create **encoder.js** file with the following content:

```js
const fs = require('fs');
require('@tensorflow/tfjs-node');
const use = require('@tensorflow-models/universal-sentence-encoder');
const moviePlots = require("./movie-plots.json");

use.load().then(async model => {
    const sampleMoviePlot = moviePlots[0];
    const embeddings = await model.embed(sampleMoviePlot['Plot']);
    console.log(embeddings.arraySync());
});
```

Run:

```bash
node encoder.js
```

Note, even though we don't use the output from ```require('@tensorflow/tfjs-node');``` directly, do not remove this
line, it is needed for Tensorflow to work correctly.

## Step 2. Cloud-Hosted free PostgreSQL setup: create Table, enable PGVector
[Video for Step 2](TODO)
### Create service pg-movie-app

For this lab we recommend using a free service with Aiven for PostgreSQL. To get extra 100$ credits when signing up with
Aiven use [this link](https://console.aiven.io/signup?referral_code=tn1i56u0u35j0hpbgbd6).

### Test with pgAdmin

To use Aiven for Postgres with pgAdmin, click on Quick Connect and select to connect with pgAdmin. You can download
there pgConnect.json that can be imported into pgAdmin as a server.

Enable PGVector:

```sql
CREATE EXTENSION vector;
```

Create a table:

```sql
CREATE TABLE movie_plots (
    title VARCHAR,
    director VARCHAR,
    cast VARCHAR,
    genre VARCHAR,
    plot TEXT,
    year SMALLINT,
    wiki VARCHAR,
    embedding vector(512)
);
```

### Connect with NodeJS

Install node-postgres:
```bash
npm install pg --save
```

Install dotenv to store credentials:
```bash
npm install dotenv --save
```

Create .env file and add the following connection information:

```bash
PG_NAME=
PG_PASSWORD=
PG_HOST=
PG_PORT=
```

Download the **ca.pem** certificate. Add both **.env** and **ca.pem** to **.gitignore**

### Send request to PG from NodeJS

In **encoder.js** include
```js
require('dotenv').config();
```

Add connection configuration:

```js
const config = {
    user: process.env.PG_NAME,
    password: process.env.PG_PASSWORD,
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    database: "defaultdb",
    ssl: {
        rejectUnauthorized: true,
        ca: fs.readFileSync('./ca.pem').toString(),
    },
};
```

Create the client, connect and send the test request:

```js
const client = new pg.Client(config);
await client.connect();
try {
    const pgResponse = await client.query(`SELECT count(*) FROM movie_plots`);
    console.log(pgResponse.rows);
} catch (err) {
    console.error(err);
} finally {
    await client.end();
}
```

## Step 3. Efficiency: Batch Tensorflow vector generation and data insertion with pg-promise multiple rows
[Video for Step 3](TODO)

### Add pg-promise

To generate and send a multi-row insert query, we'll
use [pg-promise](https://github.com/vitaly-t/pg-promise/wiki/Data-Imports);

```bash
npm install pg-promise --save
```

Include pg-promise to encoder.js:

```js
const pgp = require('pg-promise')({
    capSQL: true // capitalize all generated SQL
});
const db = pgp(config);
```

Add code to send a multi-row insert query to Postgres:

```js
const storeInPG = (moviePlots) => {
    // set of columns
    const columns = new pgp.helpers.ColumnSet(['title', 'director', 'plot', 'year', 'wiki', 'cast', 'genre', 'embedding'], {table: 'movie_plots'});

    const values = [];
    for (let i = 0; i < moviePlots.length; i++) {
        values.push({
            title: moviePlots[i]['Title'],
            director: moviePlots[i]['Director'],
            plot: moviePlots[i]['Plot'],
            year: moviePlots[i]['Release Year'],
            cast: moviePlots[i]['Cast'],
            genre: moviePlots[i]['Genre'],
            wiki: moviePlots[i]['Wiki Page'],
            embedding: `[${moviePlots[i]['embedding']}]`
        })
    }

    // generating a multi-row insert query:
    const query = pgp.helpers.insert(values, columns);

    // executing the query:
    db.none(query).then(res => console.log(res));
}
```

### Tensorflow and batch processing

Iterate over all movies and get the encodings with Tensorflow. We'll divide data into batches for faster processing:

```js
use.load().then(async model => {
    const moviePlots = loadMoviePlots('movie_plots.json');
    const batchSize = 100;
    for (let start = 0; start < moviePlots.length; start += batchSize) {
        const end = Math.min(start + batchSize, moviePlots.length);
        console.log(`Processing starting from ${start} with the step ${batchSize} of total amount ${moviePlots.length}.`);
        const plotDescriptions = moviePlots.slice(start, end).map(moviePlot => moviePlot.Plot);
        const embeddings = await model.embed(plotDescriptions);
        for (let i = start; i < end; i++) {
            moviePlots[i]['embedding'] = embeddings.arraySync()[i - start];
        }
    }

    storeInPG(moviePlots)
});
```

### Run to send the complete dataset and corresponding embeddings to PostgreSQL

```bash
node encoder.js
```

## Step 4. Contextual Search with PGVector: Node.js and Tensorflow Magic
[Video for Step 4](TODO)

### Add a script with recommender logic

Create recommender.js and include dependencies:

```js
require('dotenv').config();
const fs = require('fs');
const pg = require('pg');
require('@tensorflow/tfjs-node');
const use = require('@tensorflow-models/universal-sentence-encoder');
```

Connect to Postgres:

```js
const config = {
    user: process.env.PG_NAME,
    password: process.env.PG_PASSWORD,
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    database: "defaultdb",
    ssl: {
        rejectUnauthorized: true,
        ca: fs.readFileSync('./ca.pem').toString(),
    },
};
```

Generate embedding for a test string and use PGVector to find closest vectors in the database:

```js
use.load().then(async model => {
    const embeddings = await model.embed("a lot of cute puppies");
    const embeddingArray = embeddings.arraySync()[0];

    const client = new pg.Client(config);
    await client.connect();
    try {
        const pgResponse = await client.query(`SELECT * FROM movie_plots ORDER BY embedding <-> '${JSON.stringify(embeddingArray)}' LIMIT 5;`);
        console.log(pgResponse.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end()
    }
});
```

Run to get the results:
```bash
node recommender.js
```

# Part 2. Next.js

## Step 5. Next.js Project Setup: Postgres and Tensorflow Dependencies, testing backend
[Video for Step 5](TODO)

### Get started with Next.js project

```npx create-next-app@latest```

### Add dependencies

```bash
npm install @tensorflow-models/universal-sentence-encoder --save
```

```bash
npm install @tensorflow/tfjs-node --save
```

```bash
npm install pg --save
```

```bash
npm install dotenv --save
```

### Add PG credentials

```js
PG_NAME =
    PG_PASSWORD =
        PG_HOST =
            PG_PORT =
```

Download **ca.pem** and add it to **/certificates**

Add secret information to .gitignore

```bash
.env

/ certificates
```

### Run

```bash
npm dev run
```

Open [localhost:3000](localhost:3000) to see the landing page. Open [localhost:3000/api/hello](localhost:3000/api/hello)
to see a test backend api call.

## Step 6. Nearest Vector Retrieval: Tensorflow universal-sentence-encoder and PGVector-Powered Queries in Next.js
[Video for Step 6](TODO)

### Add an interface for a movie

Create movie.d.ts:

```js
declare type Movie = {
    title: string,
    director: string,
    cast: string,
    genre: string,
    plot: string,
    year: string,
    wiki: string,
    embedding: number[]
}

export default Movie;
```

### Add backend calls

Create a new backend endpoint, **pages/api/recommendations.ts**.

Add dependencies:

```js
const {readFileSync} = require('fs');
const pg = require('pg');
const tf = require('@tensorflow/tfjs-node');
const use = require('@tensorflow-models/universal-sentence-encoder');
```

Connect to Postgres:

```js
const postgresqlUri = process.env.PG_CONNECTION_STRING;
const conn = new URL(postgresqlUri);
const config = {
    connectionString: conn.href,
    ssl: {
        ca: readFileSync('./certificates/ca.pem').toString(),
    },
};
```

Add handler to process the requests:

```js
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<Movie[]>
) {
    const model = await use.load();
    const embeddings = await model.embed(req.body.search);
    const embeddingArray = embeddings.arraySync()[0];
    const client = new pg.Client(config);
    await client.connect();

    try {
        const pgResponse = await client.query(`SELECT * FROM movie_plots ORDER BY embedding <-> '${JSON.stringify(embeddingArray)}' LIMIT 5;`);
        res.status(200).json(pgResponse.rows)
    } catch (err) {
        console.error(err);
    } finally {
        await client.end()
    }
}

```

## Step 7. Frontend Integration: Next.js Movie Recommender UI and calls to Tensorflow and PG
[Video for Step 7](TODO)

In pages/index.tsx to request movies add:

```js
const [moviePlots, setMoviePlots] = useState < Movie[] > ([])
const searchInput = useRef();

function search(event) {
    event.preventDefault();
    const enteredSearch = searchInput.current.value;
    fetch('/api/recommendations', {
        method: 'POST',
        body: JSON.stringify({
            search: enteredSearch
        }),
        headers: {
            'Content-Type': 'application/json'
        }
    }).then(response => response.json()).then(data => {
        setMoviePlots(data);
    });
}
```

```js
return (
    <>
        <form onSubmit={search}>
            <input type="search" id="default-search" ref={searchInput} autoComplete="off"
                   placeholder="Type what do you want to watch about" required/>
            <button type="submit">
                Search
            </button>

        </form>

        <div>
            { moviePlots.map(item =>
                <div key={item.title}>
                    {item.director}
                    {item.year}
                    item.title}
                    {item.wiki}
                </div>)}
        </div>
    </>
)
```

## Step 8. Polishing and Testing: Styling Movie Recommender UI with Tailwind CSS
[Video for Step 8](TODO)

We'll add some styling with [Tailwind CSS](https://tailwindcss.com/).

## Final Verdict: PGVector, Tensorflow, Node.js, and Next.js - Success or Hiccup? 
[Video for Step 9](TODO)