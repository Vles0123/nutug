import React from 'react';
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
  SearchField,
  Input,
} from 'react-aria-components';
import { motion, useReducedMotion } from 'motion/react';
import { X, Search, Minus, Plus, ArrowUpRight } from 'lucide-react';
import { labels } from './content';

export function Mn({ as: Tag = 'span', className = '', children, ...props }) {
  return (
    <Tag lang="mn-Mong" className={`mn ${className}`} {...props}>
      {children}
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
export function Sheet({ open, onOpenChange, label, children, wide = false }) {
  const reduced = useReducedMotion();
  return (
    <ModalOverlay isOpen={open} onOpenChange={onOpenChange} isDismissable className="sheet-overlay">
      <Modal className={`sheet ${wide ? 'sheet-wide' : ''}`}>
        <motion.div
          initial={{ y: reduced ? 0 : 22, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: reduced ? 0 : 0.22 }}
        >
          <Dialog aria-label={label} className="sheet-dialog">
            <div className="sheet-bar">
              <Heading slot="title">
                <Mn>{label}</Mn>
              </Heading>
              <IconButton icon={X} label={labels.close} onPress={() => onOpenChange(false)} />
            </div>
            {children}
          </Dialog>
        </motion.div>
      </Modal>
    </ModalOverlay>
  );
}
export function ReadingSettings({ open, onOpenChange, scale, onScale }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} label={labels.type}>
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
      </div>
    </Sheet>
  );
}
export function SearchBox({ value, onChange, autoFocus = false }) {
  return (
    <SearchField
      aria-label={labels.search}
      value={value}
      onChange={onChange}
      className="search-field"
    >
      <Search size={20} aria-hidden="true" />
      <Input autoFocus={autoFocus} aria-label={labels.search} className="search-input" />
      {value && <IconButton icon={X} label={labels.close} onPress={() => onChange('')} />}
    </SearchField>
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
export function ReadingColumns({ children, className = '' }) {
  return (
    <div className={`reading-scroll ${className}`} tabIndex={0} aria-label={labels.read}>
      <div className="reading-columns">{children}</div>
    </div>
  );
}
