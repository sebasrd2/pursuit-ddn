import { type ButtonHTMLAttributes, forwardRef } from 'react'
import styles from './Button.module.css'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', className, type = 'button', ...props },
  ref,
) {
  const classes = [styles.button, styles[variant], className].filter(Boolean).join(' ')
  return <button ref={ref} type={type} className={classes} {...props} />
})
