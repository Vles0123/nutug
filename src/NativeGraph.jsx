import React, { useState, useEffect } from 'react';
import { I18nProvider } from 'react-aria-components';
import { MotionConfig } from 'motion/react';
import { uiLocale } from './ui-copy.mjs';
import { Network } from './Network';
export function NativeGraph() {
  const [value, setValue] = useState(window.NutugGraph);
  useEffect(() => {
    window.NutugGraphUpdate = setValue;
    return () => {
      delete window.NutugGraphUpdate;
    };
  }, []);
  const select = (id) => window.webkit?.messageHandlers?.nutugGraph?.postMessage(id);
  return (
    <I18nProvider locale={uiLocale}>
      <MotionConfig reducedMotion="user">
        <div className="embedded-graph">
          <Network
            nodes={value.nodes}
            edges={value.edges}
            selected={value.selected}
            onSelect={select}
            onEdge={(edge) => select(edge.from === value.selected ? edge.to : edge.from)}
            kind="people"
          />
        </div>
      </MotionConfig>
    </I18nProvider>
  );
}
