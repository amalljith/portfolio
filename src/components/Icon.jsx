export default function Icon({ name = 'arrow-up-right', className = '' }) {
  const paths = {
    'arrow-up-right': <path d="M6 18 18 6M6 6h12v12" />,
    'arrow-down': <path d="M12 4v16m-6-6 6 6 6-6" />,
    shuffle: <><path d="m17 3 4 4-4 4M3 17h3c5 0 7-10 12-10h3" /><path d="m17 13 4 4-4 4M3 7h3c1.7 0 3 1.2 4.2 3M14 15c1.2 1.2 2.4 2 4 2h3" /></>,
    menu: <path d="M4 8h16M4 16h16" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
  }
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
  )
}
