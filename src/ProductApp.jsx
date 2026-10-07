import React, { useState, useEffect, useRef } from 'react';
import { Button, Link, I18nProvider } from 'react-aria-components';
import { CalendarDays, BookOpen, RotateCw, CloudDownload, Settings2 } from 'lucide-react';
import { MotionConfig } from 'motion/react';
import { labels, uiLocale } from './ui-copy.mjs';
import { Mn, IconButton, ReadingSettings } from './ui';
import { MonthCalendar } from './MonthCalendar';
import { Chronicle } from './Chronicle';
import { ContentClient, browserStore } from './content-client.mjs';
import './tokens.css';
import './styles.css';
import './reading.css';
import './mongolian-interaction.css';
import './product.css';

const route = () =>
  /chronicle/.test(location.pathname) ||
  location.hash.startsWith('#event=') ||
  window.NutugNativePage === 'chronicle'
    ? 'chronicle'
    : 'calendar';
export function ProductApp({ manifestUrl }) {
  const [page, setPage] = useState(route),
    [snapshot, setSnapshot] = useState(null),
    [error, setError] = useState(false),
    [loading, setLoading] = useState(false);
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
    document.documentElement.style.setProperty('--reading-scale', String(scale));
    try {
      localStorage.setItem('nutug.readingScale', String(scale));
    } catch {}
  }, [scale]);
  const navigate = (next) => {
    setPage(next);
    history.pushState(null, '', next === 'calendar' ? 'calendar.html' : 'chronicle.html');
  };
  return (
    <I18nProvider locale={uiLocale}>
      <MotionConfig reducedMotion="user">
        <div className="product-app" data-page={page}>
          <header className="product-toolbar">
            <Link
              className="product-brand"
              href="calendar.html"
              aria-label={labels.brand}
              onClick={(event) => {
                event.preventDefault();
                navigate('calendar');
              }}
            >
              <Mn>{labels.brand}</Mn>
            </Link>
            <nav className="product-tabs" aria-label={labels.brand}>
              {[
                ['calendar', CalendarDays],
                ['chronicle', BookOpen],
              ].map(([id, Icon]) => (
                <Link
                  key={id}
                  href={id + '.html'}
                  aria-label={labels[id]}
                  aria-current={page === id ? 'page' : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    navigate(id);
                  }}
                >
                  <Icon size={20} />
                  <Mn>{labels[id]}</Mn>
                </Link>
              ))}
            </nav>
            <div className="product-actions">
              <IconButton
                icon={Settings2}
                label={labels.settings}
                data-action="product-settings"
                onPress={() => setSettings(true)}
              />
            </div>
          </header>
          <main className="product-content">
            {page === 'calendar' ? (
              <MonthCalendar />
            ) : snapshot ? (
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
            {page === 'chronicle' &&
              (status.error || status.offlineReady || status.updateReady || status.downloading) && (
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
          </ReadingSettings>
        </div>
      </MotionConfig>
    </I18nProvider>
  );
}
