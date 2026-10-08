import React, { useSyncExternalStore, useEffect, useState } from 'react';
import { Button, Dialog, DialogTrigger, Popover } from 'react-aria-components';
import { CloudDownload, CloudCheck, RefreshCw, LoaderCircle, RotateCw } from 'lucide-react';
import { contentClient, labels } from './content';
import { Mn } from './ui';

export function ContentControls() {
  const [shellReady, setShellReady] = useState(false);
  useEffect(() => {
    let active = true;
    (window.NutugShellReady || Promise.resolve(false)).then((ready) => {
      if (active) setShellReady(ready);
    });
    return () => {
      active = false;
    };
  }, []);
  const status = useSyncExternalStore(contentClient.subscribe, contentClient.getStatus);
  const offlineReady = status.offlineReady && shellReady;
  const Icon =
    status.downloading || status.checking
      ? LoaderCircle
      : status.updateReady
        ? RefreshCw
        : offlineReady
          ? CloudCheck
          : CloudDownload;
  return (
    <DialogTrigger>
      <Button
        className="icon-button content-control"
        aria-label={labels.download}
        data-action="content-controls"
        data-ready={offlineReady || undefined}
      >
        <Icon
          size={20}
          strokeWidth={1.7}
          className={status.downloading || status.checking ? 'spinning' : undefined}
        />
      </Button>
      <Popover className="content-popover" placement="bottom end" offset={8}>
        <Dialog aria-label={labels.download}>
          <div className="content-actions">
            <Button
              className="text-button"
              data-action={status.updateReady ? 'content-apply' : 'content-check'}
              isDisabled={status.checking || status.downloading}
              onPress={() =>
                status.updateReady ? location.reload() : contentClient.checkForUpdates()
              }
            >
              <RotateCw size={18} />
              <Mn>{labels.update}</Mn>
            </Button>
            <Button
              className="text-button"
              data-action="content-download"
              isDisabled={
                status.downloading || status.checking || contentClient.store.persistent === false
              }
              onPress={() => contentClient.downloadOffline().catch(() => {})}
            >
              <CloudDownload size={18} />
              <Mn>{labels.download}</Mn>
            </Button>
          </div>
          <div className="content-status" role="status">
            {status.downloading ? (
              <span className="numeric">
                {status.progress} / {status.total}
              </span>
            ) : offlineReady ? (
              <Mn>{labels.saved}</Mn>
            ) : null}
            {status.error && <Mn>{labels.retry}</Mn>}
          </div>
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
