export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container flex h-16 items-center px-4">
        <p className="text-sm text-muted-foreground">
          © 2025 MMORPG Marketplace. All rights reserved.
        </p>
        <div className="ml-auto flex items-center space-x-4">
          <a
            href="#"
            className="text-sm text-muted-foreground hover:underline"
          >
            Terms
          </a>
          <a
            href="#"
            className="text-sm text-muted-foreground hover:underline"
          >
            Privacy
          </a>
        </div>
      </div>
    </footer>
  )
}
