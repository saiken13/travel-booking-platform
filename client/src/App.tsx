import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ApolloClient, InMemoryCache, ApolloProvider, from, HttpLink } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { Header } from './components/common/Header';
import { SearchPage } from './pages/SearchPage';
import { BookingsPage } from './pages/BookingsPage';
import { AdminDashboard } from './components/admin/AdminDashboard';

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, path }) => {
      console.error(`[GraphQL error] ${path?.join('.')}: ${message}`);
    });
  }
  if (networkError) {
    console.error('[Network error]', networkError.message);
  }
});

const httpLink = new HttpLink({
  uri: import.meta.env.VITE_API_URL || '/graphql',
});

const client = new ApolloClient({
  link: from([errorLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { errorPolicy: 'all' },
    query: { errorPolicy: 'all' },
  },
});

export default function App() {
  return (
    <ApolloProvider client={client}>
      <BrowserRouter>
        <div className="min-h-screen font-sans">
          <Header />
          <main>
            <Routes>
              <Route path="/" element={<SearchPage />} />
              <Route path="/bookings" element={<BookingsPage />} />
              <Route path="/admin" element={<AdminDashboard />} />
            </Routes>
          </main>
          <footer className="bg-white border-t border-gray-100 py-6 mt-8">
            <div className="max-w-7xl mx-auto px-4 text-center">
              <p className="text-xs text-gray-400">
                SkyBook Travel Platform · Built with React, GraphQL, Node.js, PostgreSQL, MongoDB & Redis
              </p>
            </div>
          </footer>
        </div>
      </BrowserRouter>
    </ApolloProvider>
  );
}
