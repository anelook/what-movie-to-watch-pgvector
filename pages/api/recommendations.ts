// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
const { readFileSync } = require('fs');
const pg = require('pg');
const tf = require('@tensorflow/tfjs-node');
const use = require('@tensorflow-models/universal-sentence-encoder');

const postgresqlUri = process.env.PG_CONNECTION_STRING;

const conn = new URL(postgresqlUri);
conn.search = "";

const config = {
  connectionString: conn.href,
  ssl: {
    rejectUnauthorized: true,
    ca: readFileSync('./certificates/ca.pem').toString(),
  },
};


type Data = {
  name: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
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
