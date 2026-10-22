// Shared landmark for the authentication pages (login, signup, password reset).
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main id="main-content">{children}</main>
}
