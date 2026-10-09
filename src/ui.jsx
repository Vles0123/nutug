import React, { useEffect, useRef, useState } from 'react';
import {
  Button,
  Dialog,
  Modal,
  ModalOverlay,
  Heading,
  ToggleButton,
  ToggleButtonGroup,
  Slider,
  SliderTrack,
  SliderThumb,
  SliderOutput,
  Label,
  TextField,
  TextArea,
} from 'react-aria-components';
import { motion, useReducedMotion } from 'motion/react';
import { X, Search, Minus, Plus, ArrowUpRight } from 'lucide-react';
import { labels, uiLocale } from './ui-copy.mjs';
import { displayMongolian } from '../shared/mongolian-orthography.mjs';
import { useColumnScroll } from './useColumnScroll';

export function Mn({ as: Tag = 'span', className = '', compact = false, children, ...props }) {
  return (
    <Tag lang={uiLocale} className={`mn ${compact ? 'mn-compact' : ''} ${className}`} {...props}>
      {React.Children.map(children, (child) =>
        typeof child === 'string' ? displayMongolian(child) : child,
      )}
    </Tag>
  );
}
export function IconButton({ icon: Icon, label, className = '', ...props }) {
  return (
    <Button className={`icon-button ${className}`} aria-label={label} title={label} {...props}>
      <Icon size={20} strokeWidth={1.7} aria-hidden="true" />
    </Button>
  );
}
export function Segments({ label, items, value, onChange, className = '' }) {
  return (
    <ToggleButtonGroup
      aria-label={label}
      className={`segments ${className}`}
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={new Set([value])}
      onSelectionChange={(keys) => {
        const key = [...keys][0];
        if (key !== undefined) onChange(key);
      }}
    >
      {items.map(({ id, label, numeric }) => (
        <ToggleButton id={id} key={id} className="segment" aria-label={label}>
          {numeric ? <span className="numeric">{label}</span> : <Mn>{label}</Mn>}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
export function Sheet({
  open,
  onOpenChange,
  label,
  children,
  wide = false,
  className = '',
  headerActions,
  leadingClose = false,
}) {
  const reduced = useReducedMotion();
  return (
    <ModalOverlay isOpen={open} onOpenChange={onOpenChange} isDismissable className="sheet-overlay">
      <Modal className={`sheet ${wide ? 'sheet-wide' : ''} ${className}`}>
        <motion.div
          initial={{ y: reduced ? 0 : 22, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: reduced ? 0 : 0.22 }}
        >
          <Dialog aria-label={label} className="sheet-dialog">
            <div className="sheet-bar">
              {leadingClose && (
                <IconButton icon={X} label={labels.close} onPress={() => onOpenChange(false)} />
              )}
              <Heading slot="title">
                <Mn compact>{label}</Mn>
              </Heading>
              {headerActions}
              {!leadingClose && (
                <IconButton icon={X} label={labels.close} onPress={() => onOpenChange(false)} />
              )}
            </div>
            {children}
          </Dialog>
        </motion.div>
      </Modal>
    </ModalOverlay>
  );
}
export function ReadingSettings({
  open,
  onOpenChange,
  scale,
  onScale,
  children,
  title = labels.type,
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} label={title}>
      <div className="settings-content">
        <Slider
          minValue={0.85}
          maxValue={1.5}
          step={0.05}
          value={scale}
          onChange={onScale}
          aria-label={labels.type}
          className="reading-slider"
        >
          <div className="slider-label">
            <Label>
              <Mn>{labels.type}</Mn>
            </Label>
            <SliderOutput>{({ state }) => Math.round(state.values[0] * 100) + '%'}</SliderOutput>
          </div>
          <SliderTrack>
            {({ state }) => (
              <>
                <div
                  className="slider-fill"
                  style={{ width: state.getThumbPercent(0) * 100 + '%' }}
                />
                <SliderThumb />
              </>
            )}
          </SliderTrack>
        </Slider>
        <div className="scale-buttons">
          <IconButton icon={Minus} label={labels.smaller} onPress={() => onScale(scale - 0.05)} />
          <Button className="text-button numeric" onPress={() => onScale(1)}>
            100%
          </Button>
          <IconButton icon={Plus} label={labels.larger} onPress={() => onScale(scale + 0.05)} />
        </div>
        <div className="type-sample" style={{ '--reading-scale': scale }}>
          <Mn className="reading-text">ᠮᠣᠩᠭᠣᠯ ᠪᠢᠴᠢᠭ᠃ ᠲᠡᠦᠬᠡ ᠪᠠ ᠰᠣᠶᠣᠯ᠃</Mn>
        </div>
        {children}
      </div>
    </Sheet>
  );
}
export function SearchBox({ value, onChange, autoFocus = false }) {
  const [draft, setDraft] = useState(value);
  const composing = useRef(false),
    input = useRef(null);
  useColumnScroll(input);
  useEffect(() => {
    if (!composing.current) setDraft(value);
  }, [value]);
  const update = (next) => {
    setDraft(next);
    if (!composing.current) onChange(next);
  };
  return (
    <TextField aria-label={labels.search} value={draft} onChange={update} className="search-field">
      <Search size={20} aria-hidden="true" />
      <TextArea
        ref={input}
        autoFocus={autoFocus}
        aria-label={labels.search}
        className="search-input"
        lang={uiLocale}
        dir="ltr"
        role="searchbox"
        enterKeyHint="search"
        spellCheck={false}
        onCompositionStart={() => {
          composing.current = true;
        }}
        onCompositionEnd={(event) => {
          composing.current = false;
          update(event.currentTarget.value);
        }}
        onKeyDown={(event) => {
          if (composing.current || event.nativeEvent.isComposing) {
            event.stopPropagation();
            return;
          }
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            onChange(draft);
          }
        }}
      />
      {draft && (
        <IconButton
          icon={X}
          label={labels.clear}
          data-action="clear-search"
          onPress={() => {
            update('');
            input.current?.focus();
          }}
        />
      )}
    </TextField>
  );
}

export function SearchTrigger({ value = '', onPress, onClear }) {
  const trigger = useRef(null);
  return (
    <div className="search-control">
      <Button
        ref={trigger}
        className="search-trigger"
        data-action="catalog-search"
        onPress={onPress}
        aria-label={labels.search}
      >
        <Search size={20} aria-hidden="true" />
        <Mn>{value || labels.search}</Mn>
      </Button>
      {value && (
        <IconButton
          icon={X}
          label={labels.clear}
          data-action="clear-search"
          onPress={() => {
            onClear();
            trigger.current?.focus();
          }}
        />
      )}
    </div>
  );
}

export function MongolianTypeIcon({ size = 20 }) {
  return (
    <span aria-hidden="true" className="mongolian-type-icon" style={{ width: size, height: size }}>
      ᠠ
    </span>
  );
}

export function ColumnScroller({ children, className = '', ...props }) {
  const ref = useRef(null);
  useColumnScroll(ref);
  return (
    <div ref={ref} className={className} data-column-scroll {...props}>
      {children}
    </div>
  );
}
export function SourceLinks({ items = [] }) {
  return (
    <div className="source-links">
      {items.map((s, i) => (
        <a key={`${s.url}-${i}`} href={s.url} target="_blank" rel="noopener noreferrer">
          <ArrowUpRight size={17} aria-hidden="true" />
          <Mn>{s.title || s.name || s.label}</Mn>
        </a>
      ))}
    </div>
  );
}
export function ReadingColumns({
  children,
  className = '',
  scrollRef,
  onScroll,
  endPadding,
  pages = [],
  clipRight = 0,
}) {
  const localRef = useRef(null);
  const activeRef = scrollRef || localRef;
  useColumnScroll(activeRef);
  return (
    <div
      ref={activeRef}
      onScroll={onScroll}
      className={`reading-scroll ${className}`}
      tabIndex={0}
      aria-label={labels.read}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget || !['PageDown', 'PageUp'].includes(event.key))
          return;
        event.preventDefault();
        const element = event.currentTarget;
        const step = Math.max(1, element.clientWidth * 0.85);
        const maximum = element.scrollWidth - element.clientWidth;
        const targets = pages.length
          ? pages
          : [Math.max(0, element.scrollLeft - step), Math.min(maximum, element.scrollLeft + step)];
        const next =
          event.key === 'PageDown'
            ? targets.find((x) => x > element.scrollLeft + 1)
            : [...targets].reverse().find((x) => x < element.scrollLeft - 1);
        if (next !== undefined) element.scrollTo({ left: next, behavior: 'instant' });
      }}
      style={clipRight > 0 ? { clipPath: `inset(0 ${clipRight}px 0 0)` } : undefined}
    >
      <div
        className="reading-columns"
        style={endPadding !== undefined ? { paddingRight: endPadding } : undefined}
      >
        {children}
        {pages.map((left) => (
          <span key={left} className="reading-snap" aria-hidden="true" style={{ left }} />
        ))}
      </div>
    </div>
  );
}
