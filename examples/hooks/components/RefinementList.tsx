import React, { useEffect, useRef, useState, ChangeEvent } from 'react';
import {
  useRefinementList,
  UseRefinementListProps,
} from 'react-instantsearch-hooks';

import { ControlledSearchBox } from './ControlledSearchBox';
import { cx } from '../cx';

export type RefinementListProps = React.ComponentProps<'div'> &
  UseRefinementListProps;

export function RefinementList(props: RefinementListProps) {
  const {
    canToggleShowMore,
    isFromSearch,
    isShowingMore,
    items,
    refine,
    searchForItems,
    toggleShowMore,
  } = useRefinementList(props);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchForItems(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className={cx('ais-RefinementList', props.className)}>
      {props.searchable && (
        <div className="ais-RefinementList-searchBox">
          <ControlledSearchBox
            inputRef={inputRef}
            placeholder={props.searchablePlaceholder}
            isSearchStalled={false}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setQuery(event.currentTarget.value);
            }}
            onReset={() => {
              setQuery('');
            }}
            onSubmit={() => {
              if (items.length > 0) {
                refine(items[0].value);
                setQuery('');
              }
            }}
            value={query}
          />
        </div>
      )}
      {props.searchable && isFromSearch && items.length === 0 && (
        <div className="ais-RefinementList-noResults">No results.</div>
      )}

      <ul className="ais-RefinementList-list">
        {items.map((item) => (
          <li
            key={item.value}
            className={cx(
              'ais-RefinementList-item',
              item.isRefined && 'ais-RefinementList-item--selected'
            )}
          >
            <label className="ais-RefinementList-label">
              <input
                className="ais-RefinementList-checkbox"
                type="checkbox"
                value={item.value}
                checked={item.isRefined}
                onChange={() => {
                  refine(item.value);
                  setQuery('');
                }}
              />
              <span
                className="ais-RefinementList-labelText"
                dangerouslySetInnerHTML={{ __html: item.highlighted }}
              />
              <span className="ais-RefinementList-count">{item.count}</span>
            </label>
          </li>
        ))}
      </ul>

      {props.showMore && (
        <button
          className={cx(
            'ais-RefinementList-showMore',
            !canToggleShowMore && 'ais-RefinementList-showMore--disabled'
          )}
          disabled={!canToggleShowMore}
          onClick={toggleShowMore}
        >
          {isShowingMore ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}
