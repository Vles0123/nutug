import React from 'react';
import { Button } from 'react-aria-components';
import { Check } from 'lucide-react';
import { Mn } from './ui';
import { calendarSkins } from './calendar-skins.mjs';
import { calendarCopy as copy } from './calendar-copy.mjs';
export function SkinPicker({ value, onChange }) {
  return (
    <div className="skin-choices" role="group" aria-label={copy.appearance}>
      {calendarSkins.map((skin) => (
        <Button
          key={skin}
          data-skin-choice={skin}
          aria-pressed={value === skin}
          onPress={() => onChange(skin)}
        >
          <span className={`skin-sample skin-${skin}`} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <Mn>{copy[skin]}</Mn>
          {value === skin && <Check size={16} />}
        </Button>
      ))}
    </div>
  );
}
