import React, { useState, useEffect, useRef } from 'react';
import { Button, Link, I18nProvider } from 'react-aria-components';
import { RotateCw, CloudDownload, Settings2 } from 'lucide-react';
import { MotionConfig } from 'motion/react';
import { labels, uiLocale } from './ui-copy.mjs';
import { Mn, IconButton, ReadingSettings } from './ui';
import { SkinPicker } from './SkinPicker';
import { calendarCopy as calendarCopy } from './calendar-copy.mjs';
import { calendarSkins } from './calendar-skins.mjs';
import { CalendarWorkspace } from './CalendarWorkspace';
import { Chronicle } from './Chronicle';
import { ContentClient, browserStore } from './content-client.mjs';
import './tokens.css';
import './styles.css';
import './reading.css';
import './mongolian-interaction.css';
import './product.css';

const route = () => {
  const product = document.documentElement.dataset.product;
  if (product === 'history') return 'chronicle';
  if (product === 'calendar') return 'calendar';
  return /chronicle/.test(location.pathname) ||
    location.hash.startsWith('#event=') ||
    window.NutugNativePage === 'chronicle'
    ? 'chronicle'
    : 'calendar';
};
export function ProductApp({ manifestUrl }) {
  const [page, setPage] = useState(route),
    [snapshot, setSnapshot] = useState(null),
    [error, setError] = useState(false),
    [loading, setLoading] = useState(false);
  const [skin, setSkin] = useState(() => {
    try {
      const value = localStorage.getItem('nutug.history.skin');
      return calendarSkins.includes(value) ? value : 'light';
    } catch {
      return 'light';
    }
  });
  useEffect(() => {
    if (page !== 'chronicle') return;
    document.documentElement.dataset.skin = skin;
    try {
      localStorage.setItem('nutug.history.skin', skin);
    } catch {}
  }, [skin, page]);
  const [settings, setSettings] = useState(false),
    [scale, setScale] = useState(() => {
      try {
        return Math.max(
          0.85,
          Math.min(1.5, Number(localStorage.getItem('nutug.readingScale')) || 1),
        );
      } catch {
        return 1;
      }
    });
  const [status, setStatus] = useState({}),
    client = useRef(null),
    pending = useRef(null),
    unsub = useRef(null),
    stop = useRef(null);
  const load = () => {
    if (pending.current) return pending.current;
    setLoading(true);
    setError(false);
    pending.current = (async () => {
      client.current ||= new ContentClient({
        manifestUrl,
        store: await browserStore(),
        scope: 'core',
      });
      if (!unsub.current)
        unsub.current = client.current.subscribe(() => setStatus(client.current.getStatus()));
      const value = await client.current.load();
      setSnapshot(value);
      if (!stop.current) stop.current = client.current.start();
      return value;
    })()
      .catch(() => setError(true))
      .finally(() => {
        pending.current = null;
        setLoading(false);
      });
    return pending.current;
  };
  useEffect(() => {
    if (page === 'chronicle' && !snapshot) load();
    document.title = labels[page];
  }, [page]);
  useEffect(() => {
    const change = () => setPage(route());
    window.addEventListener('popstate', change);
    return () => {
      window.removeEventListener('popstate', change);
      unsub.current?.();
      stop.current?.();
    };
  }, []);
  useEffect(() => {
    if (page !== 'chronicle') return;
    document.documentElement.style.setProperty('--reading-scale', String(scale));
    try {
      localStorage.setItem('nutug.readingScale', String(scale));
    } catch {}
  }, [scale, page]);
  const navigate = (next) => {
    setPage(next);
    history.pushState(null, '', next === 'calendar' ? 'calendar.html' : 'chronicle.html');
  };
  return (
    <I18nProvider locale={uiLocale}>
      <MotionConfig reducedMotion="user">
        {page === 'calendar' ? (
          <CalendarWorkspace />
        ) : (
          <div className="product-app" data-page="chronicle">
            <header className="product-toolbar">
              <Link
                className="product-brand"
                href="chronicle.html"
                aria-label={labels.chronicle}
                onClick={(event) => {
                  event.preventDefault();
                  navigate('chronicle');
                }}
              >
                <Mn>{labels.chronicle}</Mn>
              </Link>
              <div className="product-actions" data-update={status.updateReady || undefined}>
                <IconButton
                  icon={Settings2}
                  label={labels.settings}
                  data-action="product-settings"
                  onPress={() => setSettings(true)}
                />
              </div>
            </header>
            <main className="product-content">
              {page === 'calendar' ? null : snapshot ? (
                <Chronicle snapshot={snapshot} />
              ) : (
                <div className="history-loading" role="status">
                  {loading ? (
                    <span className="bootstrap-spinner" aria-label={labels.chronicle} />
                  ) : error ? (
                    <Button className="text-button" onPress={load}>
                      <Mn>{labels.retry}</Mn>
                    </Button>
                  ) : null}
                </div>
              )}
            </main>
            <ReadingSettings
              open={settings}
              onOpenChange={setSettings}
              scale={scale}
              onScale={(value) =>
                setScale(Math.round(Math.max(0.85, Math.min(1.5, value)) * 100) / 100)
              }
              title={labels.settings}
            >
              <Mn className="history-appearance-label">{calendarCopy.appearance}</Mn>
              <SkinPicker value={skin} onChange={setSkin} />
              <div className="product-download-actions">
                {' '}
                {page === 'chronicle' && snapshot && (
                  <>
                    <IconButton
                      icon={RotateCw}
                      label={labels.update}
                      isDisabled={status.checking || status.downloading}
                      data-action="history-update"
                      onPress={() =>
                        status.updateReady ? location.reload() : client.current.checkForUpdates()
                      }
                    />
                    <IconButton
                      icon={CloudDownload}
                      label={labels.download}
                      isDisabled={status.checking || status.downloading}
                      data-action="history-download"
                      onPress={() => client.current.downloadOffline().catch(() => {})}
                    />
                  </>
                )}
              </div>
              {page === 'chronicle' &&
                (status.error ||
                  status.offlineReady ||
                  status.updateReady ||
                  status.downloading) && (
                  <div className="product-content-status" role="status">
                    <Mn>
                      {status.error
                        ? labels.retry
                        : status.updateReady
                          ? labels.update
                          : status.offlineReady
                            ? labels.saved
                            : labels.download}
                    </Mn>
                  </div>
                )}
            </ReadingSettings>
          </div>
        )}
      </MotionConfig>
    </I18nProvider>
  );
}
