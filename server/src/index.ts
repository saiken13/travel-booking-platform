import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { json } from 'body-parser';
import dotenv from 'dotenv';

import { typeDefs } from './graphql/schema';
import { resolvers } from './resolvers';
import { pool, initializePostgres, seedDefaultExperiments } from './db/postgres';
import { connectMongoDB } from './db/mongodb';

dotenv.config();

const PORT = parseInt(process.env.PORT || '4000', 10);

interface ApolloContext {
  req: express.Request;
}

async function startServer(): Promise<void> {
  const app = express();

  // Initialize databases (fail-safe — server starts even if DBs are down)
  await Promise.allSettled([
    initializePostgres().then(() => seedDefaultExperiments()).catch((e) => {
      console.warn('⚠️  PostgreSQL unavailable:', e.message);
    }),
    connectMongoDB(),
  ]);

  const apollo = new ApolloServer<ApolloContext>({
    typeDefs,
    resolvers,
    formatError: (formattedError, error) => {
      console.error('[GraphQL Error]', formattedError.message);
      if (process.env.NODE_ENV === 'production') {
        // Hide internal details in production
        return { message: formattedError.message, path: formattedError.path };
      }
      return formattedError;
    },
    introspection: true,
  });

  await apollo.start();

  app.use(
    cors({
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    })
  );

  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  // Health check endpoint
  app.get('/health', async (_req, res) => {
    let pgOk = false;
    try {
      await pool.query('SELECT 1');
      pgOk = true;
    } catch {
      // postgres down
    }

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: { postgres: pgOk ? 'up' : 'down' },
    });
  });

  app.use(
    '/graphql',
    json(),
    expressMiddleware(apollo, {
      context: async ({ req }) => ({ req }),
    })
  );

  app.listen(PORT, () => {
    console.log(`\n🚀 Server ready at http://localhost:${PORT}/graphql`);
    console.log(`🏥 Health check at http://localhost:${PORT}/health\n`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
