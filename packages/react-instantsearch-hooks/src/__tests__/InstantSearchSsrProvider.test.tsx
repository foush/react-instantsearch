import { render, screen, waitFor } from '@testing-library/react';
import { SearchParameters, SearchResults } from 'algoliasearch-helper';
import React from 'react';

import { createSearchClient } from '../../../../test/mock';
import { InstantSearch } from '../InstantSearch';
import { InstantSearchSSRProvider } from '../InstantSearchSSRProvider';
import { useHits } from '../useHits';

function Hits() {
  const { hits } = useHits();

  if (hits.length === 0) {
    return null;
  }

  return (
    <ol>
      {hits.map((hit) => (
        <li key={hit.objectID}>{hit.objectID}</li>
      ))}
    </ol>
  );
}

describe('InstantSearchSSRProvider', () => {
  test('provides initialResults to InstantSearch', async () => {
    const searchClient = createSearchClient();
    const initialResults = {
      indexName: new SearchResults(new SearchParameters(), [
        // @ts-ignore Result is not exhaustive
        {
          hits: [{ objectID: '1' }, { objectID: '2' }, { objectID: '3' }],
        },
      ]),
    };

    function App() {
      return (
        <InstantSearchSSRProvider initialResults={initialResults}>
          <InstantSearch searchClient={searchClient} indexName="indexName">
            <Hits />
          </InstantSearch>
        </InstantSearchSSRProvider>
      );
    }

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('list')).toMatchInlineSnapshot(`
<ol>
  <li>
    1
  </li>
  <li>
    2
  </li>
  <li>
    3
  </li>
</ol>
`);
    });
  });

  test('without props renders children', async () => {
    const searchClient = createSearchClient();

    function App() {
      return (
        <InstantSearchSSRProvider>
          <InstantSearch searchClient={searchClient} indexName="indexName">
            <h1>Search</h1>
            <Hits />
          </InstantSearch>
        </InstantSearchSSRProvider>
      );
    }

    render(<App />);

    await waitFor(() => {
      expect(screen.queryAllByRole('heading')).toHaveLength(1);
      expect(screen.queryByRole('list')).toBeNull();
    });
  });
});
