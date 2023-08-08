
# Create movie recommender using Postgres, vector search and Next.js
In this lab you'll learn how to build a recommendation system using vector search, Postgres and Next.js.

# Steps accompanying by videos

## Building a Movie Recommender with Postgres, Vector Search, and Next.js | Project Intro
Short information on what we'll build

## JSON Movie Dataset: kickstarting the work on Movie Recommendation Engine | 1
Share the link to the dataset, show the original source and explain what additional steps were done to the dataset

## Creating Vector Embeddings: Tensorflow universal-sentence-encoder and Node.js | 2
Create encoder.js and add code to get a single vector embedding for a movie

## Cloud-Hosted free PostgreSQL setup: create Table, enable PGVector | 3
create service pg-movie-app
connect with pgAdmin - create a table
connect with NodeJS - get version
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

```sql
CREATE EXTENSION vector;
```

## Efficiency: Batch Tensorflow vector generation and data insertion with pg-promise multiple rows | 4
change the file to iterate over all movies
get embedding and send to PG

## Contextual Search with PGVector: Node.js and Tensorflow Magic | 5
Combine functionality of generating a single embedding and sending SQL requires to PG db for recommendation

## Next.js Project Setup: Postgres and Tensorflow Dependencies, testing backend | 6
Run command to set up Next.js project, add necessary dependencies, show how to test backend separately

## Next.js Backend: Tensorflow  tfjs-node and universal-sentence-encoder | 7
Incorporating Tensorflow and the encoder into the Next.js backend.

## Nearest Vector Retrieval: PGVector-Powered Queries in Next.js | 8
Sending requests to retrieve nearest vectors using PGVector.

## Frontend Integration: Next.js Movie Recommender UI and calls to Tensorflow and PG | 9
Building the frontend UI and connecting it to the backend APIs.

## Polishing and Testing: Styling Movie Recommender UI with Tailwind CSS | 10
Final touches, styling with Tailwind CSS.

## Final Verdict: PGVector, Tensorflow, Node.js, and Next.js - Success or Hiccup? | 11