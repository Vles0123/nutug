import React, { useRef, useState } from 'react';
import { Button } from 'react-aria-components';
import { Check, Plus, Upload, Download, Pencil, Trash2 } from 'lucide-react';
import { Mn } from './ui';
import { calendarSkins } from './calendar-skins.mjs';
import { calendarCopy as copy } from './calendar-copy.mjs';
import {
  decodeTheme,
  encodeTheme,
  normalizeTheme,
  themeLimit,
  themeIsDark,
} from '../shared/calendar-themes.mjs';

export function SkinPicker({ value, themes = [], onUpdate }) {
  const [draft, setDraft] = useState(null),
    [error, setError] = useState('');
  const file = useRef(null);
  const current = themes.find((t) => `custom:${t.id}` === value);
  const edit = (theme) => {
    setError('');
    setDraft(
      theme
        ? JSON.parse(JSON.stringify(theme))
        : {
            format: 'nutug-theme',
            version: 1,
            id: crypto.randomUUID(),
            name: '',
            colors: { background: '#FFFFFF', text: '#1D1D1F', accent: '#007AFF' },
          },
    );
  };
  const exported = () => {
    const url = URL.createObjectURL(new Blob([encodeTheme(current)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Nutug-theme.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="theme-manager">
      <div className="skin-choices" role="group" aria-label={copy.appearance}>
        {[
          ...calendarSkins.map((id) => ({ id, name: copy[id] })),
          ...themes.map((t) => ({ id: `custom:${t.id}`, name: t.name, colors: t.colors })),
        ].map((skin) => (
          <Button
            key={skin.id}
            data-skin-choice={skin.id}
            aria-pressed={value === skin.id}
            onPress={() => onUpdate({ skin: skin.id })}
          >
            <span
              className={`skin-sample skin-${skin.id}`}
              aria-hidden="true"
              style={
                skin.colors
                  ? {
                      background: skin.colors.background,
                      color: skin.colors.text,
                      borderColor: skin.colors.accent,
                    }
                  : undefined
              }
            >
              <i />
              <i />
              <i />
            </span>
            <Mn compact>{skin.name}</Mn>
            <span className="skin-choice-check" aria-hidden="true">
              {value === skin.id && <Check size={16} />}
            </span>
          </Button>
        ))}
      </div>
      <div className="theme-actions">
        <Button data-theme-action="new" onPress={() => edit()} aria-label={copy.add}>
          <Plus />
          <Mn compact>{copy.add}</Mn>
        </Button>
        <Button
          data-theme-action="import"
          onPress={() => file.current.click()}
          aria-label={copy.import}
        >
          <Upload />
          <Mn compact>{copy.import}</Mn>
        </Button>
        {current && (
          <>
            <Button data-theme-action="edit" onPress={() => edit(current)} aria-label={copy.edit}>
              <Pencil />
              <Mn compact>{copy.edit}</Mn>
            </Button>
            <Button data-theme-action="export" onPress={exported} aria-label={copy.export}>
              <Download />
              <Mn compact>{copy.export}</Mn>
            </Button>
            <Button
              data-theme-action="delete"
              onPress={() => {
                onUpdate({ themes: themes.filter((t) => t.id !== current.id), skin: 'light' });
                setDraft(null);
              }}
              aria-label={copy.delete}
            >
              <Trash2 />
              <Mn compact>{copy.delete}</Mn>
            </Button>
          </>
        )}
      </div>
      <input
        ref={file}
        hidden
        type="file"
        accept=".json,application/json"
        data-theme-file
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          try {
            if (f.size > themeLimit) throw Error();
            const theme = decodeTheme(await f.text());
            theme.id = crypto.randomUUID();
            onUpdate({ themes: [...themes, theme], skin: `custom:${theme.id}` });
            setError('');
          } catch {
            setError(copy.importError);
          }
        }}
      />
      {draft && (
        <div className="theme-editor">
          <label>
            <Mn compact>{copy.title}</Mn>
            <textarea
              className="mn"
              data-theme-name
              autoFocus
              aria-label={copy.title}
              maxLength={120}
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          {['background', 'text', 'accent'].map((key) => (
            <label key={key}>
              <Mn compact>
                {
                  copy[
                    { background: 'themeBackground', text: 'themeText', accent: 'themeAccent' }[key]
                  ]
                }
              </Mn>
              <input
                type="color"
                data-theme-color={key}
                aria-label={
                  copy[
                    { background: 'themeBackground', text: 'themeText', accent: 'themeAccent' }[key]
                  ]
                }
                value={draft.colors[key]}
                onChange={(e) =>
                  setDraft({ ...draft, colors: { ...draft.colors, [key]: e.target.value } })
                }
              />
              <input
                className="numeric theme-hex"
                data-theme-hex={key}
                aria-label={
                  copy[
                    { background: 'themeBackground', text: 'themeText', accent: 'themeAccent' }[key]
                  ] + ' #'
                }
                value={draft.colors[key]}
                maxLength={7}
                spellCheck={false}
                onChange={(e) =>
                  setDraft({ ...draft, colors: { ...draft.colors, [key]: e.target.value } })
                }
              />
            </label>
          ))}
          <div
            className="theme-preview"
            style={{
              background: draft.colors.background,
              color: draft.colors.text,
              borderColor: draft.colors.accent,
            }}
          >
            <span
              style={{
                background: draft.colors.accent,
                color: themeIsDark(draft.colors.accent) ? '#FFFFFF' : '#000000',
              }}
            >
              15
            </span>
            <Mn>{copy.agenda}</Mn>
            <Mn>{copy.today}</Mn>
          </div>
          <div className="theme-actions">
            <Button
              data-theme-action="save"
              onPress={() => {
                try {
                  const theme = normalizeTheme(draft);
                  onUpdate({
                    themes: [...themes.filter((t) => t.id !== theme.id), theme],
                    skin: `custom:${theme.id}`,
                  });
                  setDraft(null);
                  setError('');
                } catch {
                  setError(copy.invalid);
                }
              }}
            >
              <Check />
              <Mn compact>{copy.save}</Mn>
            </Button>
            <Button
              data-theme-action="cancel"
              onPress={() => {
                setDraft(null);
                setError('');
              }}
            >
              <Mn compact>{copy.undo}</Mn>
            </Button>
          </div>
        </div>
      )}
      {error && (
        <div role="alert">
          <Mn>{error}</Mn>
        </div>
      )}
    </div>
  );
}
