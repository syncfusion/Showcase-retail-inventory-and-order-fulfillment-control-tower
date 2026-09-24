import { useState } from 'react';
import { DialogComponent } from '@syncfusion/ej2-react-popups';
import { DateTimePickerComponent } from '@syncfusion/ej2-react-calendars';
import type { Order } from '../domain/types.ts';

export function PromisedDateDialog({ order, onClose, onSubmit }: { order: Order; onClose: () => void; onSubmit: (date: string) => void }) {
  const [value, setValue] = useState<Date | undefined>(new Date(order.promisedDeliveryDate));
  const [error, setError] = useState('');

  function save() {
    if (!value) { setError('Enter a valid date and time.'); return; }
    onSubmit(value.toISOString());
  }

  const buttons = [
    { buttonModel: { content: 'Cancel', cssClass: 'action-button' }, click: onClose },
    { buttonModel: { content: 'Save date', isPrimary: true, cssClass: 'primary-button' }, click: save },
  ];

  return <DialogComponent header={`Edit promised date — ${order.id}`} visible isModal showCloseIcon width="440px" target="#root" close={onClose} animationSettings={{ effect: 'None' }} buttons={buttons}>
    <div className="field full">
      <label htmlFor="promised-date">Promised delivery date/time</label>
      <DateTimePickerComponent id="promised-date" htmlAttributes={{ 'aria-label': 'Promised delivery date/time' }}
        value={value} format="MM/dd/yyyy hh:mm a" step={30} strictMode={false}
        change={args => { setValue(args.value ?? undefined); setError(''); }} />
    </div>
    {error && <p className="notice error" role="alert">{error}</p>}
  </DialogComponent>;
}
