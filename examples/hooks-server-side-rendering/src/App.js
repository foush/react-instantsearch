import React from 'react';
import {
  InstantSearch,
  InstantSearchSSRProvider,
} from 'react-instantsearch-hooks';
import { simple } from 'instantsearch.js/es/lib/stateMappings';
import { history } from 'instantsearch.js/es/lib/routers';

import { searchClient } from './searchClient';

import { SearchBox, Hits, RefinementList } from './components';

function Hit({ hit }) {
  return (
    <span
      dangerouslySetInnerHTML={{
        __html: hit._highlightResult.name.value,
      }}
    />
  );
}

function App({ serverState, location }) {
  return (
    <InstantSearchSSRProvider {...serverState}>
      <InstantSearch
        indexName="instant_search"
        searchClient={searchClient}
        routing={{
          stateMapping: simple(),
          router: history({
            getLocation() {
              if (typeof window === 'undefined') {
                return location;
              }

              return window.location;
            },
          }),
        }}
      >
        <div
          style={{
            display: 'grid',
            alignItems: 'flex-start',
            gridTemplateColumns: '200px 1fr',
            gap: '0.5rem',
          }}
        >
          <div>
            <RefinementList
              attribute="brand"
              searchable={true}
              searchablePlaceholder="Search brands"
              showMore={true}
            />
          </div>
          <div style={{ display: 'grid', gap: '.5rem' }}>
            <SearchBox placeholder="Search" />
            <Hits hitComponent={Hit} />
          </div>
        </div>
      </InstantSearch>
    </InstantSearchSSRProvider>
  );
}

export default App;
