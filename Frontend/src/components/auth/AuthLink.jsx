import { Link, useOutletContext } from 'react-router-dom';

export default function AuthLink({ to, children, ...props }) {
  const { transitionTo } = useOutletContext();
  return <Link {...props} to={to} onClick={(event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    event.preventDefault();
    transitionTo(to);
  }}>{children}</Link>;
}

