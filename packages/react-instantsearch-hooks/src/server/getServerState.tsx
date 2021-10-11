import { isIndexWidget } from 'instantsearch.js/es/widgets/index/index';
import React from 'react';
import { renderToString } from 'react-dom/server';

import { InstantSearchServerContext } from '../InstantSearchServerContext';

import type {
  InstantSearchServerApi,
  InstantSearchSsrClient,
} from '../InstantSearchServerContext';
import type { InstantSearchServerState } from '../InstantSearchSSRContext';
import type { InitialResults } from '../useInstantSearch';
import type { AlgoliaSearchHelper, SearchResults } from 'algoliasearch-helper';
import type { IndexWidget } from 'instantsearch.js/es/widgets/index/index';
import type { ReactNode } from 'react';

export async function getServerState(
  children: ReactNode
): Promise<InstantSearchServerState> {
  const ssrClient: InstantSearchSsrClient = {
    helper: undefined,
    search: undefined,
    cachedResponses: undefined,
  };

  const notifyServer: InstantSearchServerApi['notifyServer'] = ({
    helper,
    search,
    cachedResponses,
  }) => {
    ssrClient.helper = helper;
    ssrClient.search = search;
    ssrClient.cachedResponses = cachedResponses;
  };

  renderToString(
    <InstantSearchServerContext.Provider value={{ notifyServer }}>
      {children}
    </InstantSearchServerContext.Provider>
  );

  await new Promise((resolve) => setTimeout(resolve, 0));

  if (!ssrClient.helper || !ssrClient.search) {
    throw new Error(
      'Unable to get <InstantSearch> server state in `getServerState`.'
    );
  }

  const helper = ssrClient.helper!;
  const search = ssrClient.search!;
  const cachedResponses = ssrClient.cachedResponses!;

  await waitForResults(helper);

  const initialResults: InitialResults = resolveIndex<SearchResults>(
    search.mainIndex,
    (indexWidget) => {
      return {
        [indexWidget.getIndexId()]: indexWidget.getResults()!,
      };
    }
  );

  return {
    initialResults,
    cachedResponses,
  };
}

function resolveIndex<TValue>(
  indexWidget: IndexWidget,
  callback: (widget: IndexWidget) => Record<string, TValue>
) {
  return indexWidget.getWidgets().reduce((acc, widget) => {
    if (!isIndexWidget(widget)) {
      return acc;
    }

    return {
      ...acc,
      ...resolveIndex(widget, callback),
    };
  }, callback(indexWidget));
}

function waitForResults(helper: AlgoliaSearchHelper) {
  return new Promise<void>((resolve, reject) => {
    helper.searchOnlyWithDerivedHelpers();

    // All derived helpers resolve in the same tick so we're safe only relying
    // on the first one.
    helper.derivedHelpers[0].on('result', () => {
      resolve();
    });

    helper.derivedHelpers.forEach((derivedHelper) =>
      derivedHelper.on('error', (error) => {
        reject(error);
      })
    );
  });
}
