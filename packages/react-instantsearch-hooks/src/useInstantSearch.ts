import algoliasearchHelper from 'algoliasearch-helper';
import instantsearch from 'instantsearch.js';
import { useEffect, useMemo, version as ReactVersion } from 'react';

import { useForceUpdate } from './useForceUpdate';
import { useInstantSearchServerContext } from './useInstantSearchServerContext';
import { useInstantSearchSsrContext } from './useInstantSearchSsrContext';
import { useStableValue } from './useStableValue';
import { noop, warn } from './utils';
import version from './version';

import type { InstantSearchServerApi } from './InstantSearchServerContext';
import type { InstantSearchServerState } from './InstantSearchSSRContext';
import type { SearchClient as SearchClientV4 } from '@algolia/client-search';
import type { SearchResults } from 'algoliasearch-helper';
import type {
  InstantSearchOptions,
  InstantSearch,
  SearchClient,
} from 'instantsearch.js';

const defaultUserAgents = [
  `react (${ReactVersion})`,
  `react-instantsearch (${version})`,
  `react-instantsearch-hooks (${version})`,
];

export type InitialResults = Record<string, SearchResults>;

export type UseInstantSearchProps = InstantSearchOptions & {
  /**
   * Removes the console warning about the experimental version.
   *
   * Note that this warning is only displayed in development mode.
   *
   * @default false
   */
  suppressExperimentalWarning?: boolean;
};

export function useInstantSearch({
  suppressExperimentalWarning = false,
  ...props
}: UseInstantSearchProps) {
  const serverContext = useInstantSearchServerContext();
  const serverState = useInstantSearchSsrContext();
  const stableProps = useStableValue(props);
  const search = useMemo(
    () =>
      ssrAdapter(
        instantsearch(stableProps),
        stableProps,
        serverContext,
        serverState
      ),
    [stableProps, serverContext, serverState]
  );
  const forceUpdate = useForceUpdate();

  useEffect(() => {
    warn(
      suppressExperimentalWarning,
      'This version is experimental and not production-ready.\n\n' +
        'Please report any bugs at https://github.com/algolia/react-instantsearch/issues/new?template=Bug_report_Hooks.md&labels=Scope%3A%20Hooks\n\n' +
        '(To disable this warning, pass `suppressExperimentalWarning` to <InstantSearch />.)'
    );
  }, [suppressExperimentalWarning]);

  useEffect(() => {
    addAlgoliaAgents(stableProps.searchClient, defaultUserAgents);
  }, [stableProps.searchClient]);

  useEffect(() => {
    const isServerSideRendering = Boolean(serverState?.initialResults);

    // We don't rely on the `start()` method in SSR because we manually call
    // `mainIndex.init()` to inject the Helper.
    if (!isServerSideRendering) {
      search.start();
      forceUpdate();
    }

    return () => {
      search.dispose();
      forceUpdate();
    };
  }, [
    search,
    serverState,
    stableProps.searchClient,
    stableProps.indexName,
    forceUpdate,
  ]);

  return search;
}

function ssrAdapter(
  search: InstantSearch,
  props: UseInstantSearchProps,
  serverContext: InstantSearchServerApi | null,
  serverState: Partial<InstantSearchServerState> | null
): InstantSearch {
  const initialResults = serverState?.initialResults;
  const cachedResponses = serverState?.cachedResponses || {};

  // We store the cached response to later provide it to the search client
  // when SSR rendering.
  if (serverContext && isSearchClientV4(props.searchClient)) {
    const originalCacheSet = props.searchClient.transporter.responsesCache.set;
    // @ts-ignore `set()` is a read-only property.
    props.searchClient.transporter.responsesCache.set = (
      key: Record<string, unknown> | string,
      value: Record<string, unknown> | string
    ) => {
      cachedResponses[JSON.stringify(key)] = JSON.stringify(value);

      return originalCacheSet(key, value);
    };
  }

  // We hydrate the client cache from the server response in SSR.
  if (
    Object.keys(cachedResponses).length > 0 &&
    isSearchClientV4(props.searchClient)
  ) {
    Object.entries(cachedResponses).forEach(([key, value]) => {
      // TypeScript is unable to infer that it's a search client v4 here.
      (
        props.searchClient as unknown as SearchClientV4
      ).transporter.responsesCache.set(JSON.parse(key), JSON.parse(value));
    });
  }

  if (serverContext || initialResults) {
    // We create a Helper and inject it in the search instance to get notify
    // of the search events on the server.
    const helper = algoliasearchHelper(props.searchClient, props.indexName);
    search.helper = helper;
    search.mainHelper = helper;

    // We patch the `scheduleSearch` method to skip the frontend network request
    // made when `addWidgets` gets called. We don't need to query Algolia because
    // we already have the results passed by the SSR Provider.
    // This patch works with all kinds of search clients. However, it's not yet
    // cached in the search client, meaning that the same query happening another
    // time (e.g., hitting `space`, and then `backspace`) will hit the network.
    const scheduleSearch = noop;
    (scheduleSearch as typeof search['scheduleSearch']).wait = () =>
      Promise.resolve();
    (scheduleSearch as typeof search['scheduleSearch']).cancel = noop;
    search.scheduleSearch = scheduleSearch as typeof search['scheduleSearch'];

    // We manually subscribe all middleware. This brings support for routing.
    search.middleware.forEach(({ instance }) => {
      instance.subscribe();
    });

    // We directly initialize the main index with the search that we've patched
    // because we don't rely on `start()` on the server.
    search.mainIndex.init({
      instantSearchInstance: search,
      parent: null,
      uiState: search._initialUiState,
    });

    // We manually flag the search as started to have an internal state as close
    // as the original `start()` method.
    search.started = true;

    if (serverContext) {
      // On the browser, we add user agents in an effect. Since effects are not
      // run on the server, we need to add them in this scope.
      addAlgoliaAgents(props.searchClient, [
        ...defaultUserAgents,
        `react-instantsearch-server (${version})`,
      ]);

      // We notify `getServerState()` of the InstantSearch internals to retrieve
      // the server state and pass it to the next render pass in SSR.
      serverContext.notifyServer({
        helper,
        search,
        cachedResponses,
      });
    }
  }

  return search;
}

function addAlgoliaAgents(searchClient: SearchClient, userAgents: string[]) {
  if (typeof searchClient.addAlgoliaAgent !== 'function') {
    return;
  }

  userAgents.forEach((userAgent) => {
    // @ts-ignore The `addAlgoliaAgent()` method exists because we've checked above.
    searchClient.addAlgoliaAgent(userAgent);
  });
}

function isSearchClientV4(client: any): client is SearchClientV4 {
  return Boolean(client.transporter);
}
