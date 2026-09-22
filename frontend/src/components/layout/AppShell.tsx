import { NavLink, Outlet } from 'react-router-dom'
import styles from './AppShell.module.css'

const NAV_LINKS = [
  { to: '/', label: 'RFPs', end: true },
  { to: '/knowledge', label: 'Knowledge' },
  { to: '/settings', label: 'Settings' },
]

export function AppShell() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <NavLink to="/" className={styles.brand}>
            Pursuit
          </NavLink>
          <nav className={styles.nav} aria-label="Main">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => [styles.navLink, isActive ? styles.navLinkActive : ''].join(' ')}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
