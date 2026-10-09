import { Children, useEffect, useRef, useState } from 'react';

export default function ResponsiveFilterSelect({ value, onChange, children, id }) {
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 900px)').matches);
  const panel = useRef(null);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 900px)');
    const update = () => setMobile(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  if (!mobile) return <select id={id} value={value} onChange={onChange}>{children}</select>;
  const options = Children.toArray(children).flatMap(child => Array.isArray(child) ? child : [child]);
  const selected = options.find(option => String(option.props.value) === String(value));
  return <details className="mobile-filter-select" ref={panel} onKeyDown={event => {
    if (event.key === 'Escape') { panel.current.open = false; panel.current.querySelector('summary').focus(); }
  }}>
    <summary id={id}>{selected?.props.children || 'Todas'}</summary>
    <div className="mobile-filter-options">
      {options.map(option => <button type="button" key={option.props.value} aria-pressed={String(option.props.value) === String(value)} onClick={() => {
        onChange({ target: { value: String(option.props.value) } });
        panel.current.open = false;
        panel.current.querySelector('summary').focus();
      }}>{option.props.children}</button>)}
    </div>
  </details>;
}
