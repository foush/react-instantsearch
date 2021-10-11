import { createContext } from 'react';

import type { AlgoliaSearchHelper } from 'algoliasearch-helper';
import type { InstantSearch } from 'instantsearch.js';

export type InstantSearchSsrClient = {
  helper?: AlgoliaSearchHelper;
  search?: InstantSearch;
  cachedResponses?: Record<string, string>;
};

export type InstantSearchServerApi = {
  notifyServer(params: Required<InstantSearchSsrClient>): void;
};

export const InstantSearchServerContext =
  createContext<InstantSearchServerApi | null>(null);

if (__DEV__) {
  InstantSearchServerContext.displayName = 'InstantSearchServer';
}
