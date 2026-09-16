import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu, X, LayoutDashboard, LogOut, ShieldCheck, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

const ADMIN_EMAILS = String(import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

/** Shown in the desktop bar. */
const mainLinks = [
  { name: 'Home', href: '#home' },
  { name: 'About', href: '#about' },
  { name: 'Courses', href: '#courses' },
  { name: 'Programs', href: '#programs' },
  { name: 'Why Us', href: '#why-us' },
  { name: 'Contact', href: '#contact' },
];

/** Added to the mobile menu only - also linked from the footer. */
const secondaryLinks = [
  { name: 'Privacy Policy', href: '/privacy-policy' },
  { name: 'Terms of Use', href: '/terms-of-use' },
  { name: 'Delete Account', href: '/delete-account' },
];

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  const isAdmin = Boolean(user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock background scrolling while the mobile sheet is open.
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const handleNavClick = (href: string) => {
    setIsMobileMenuOpen(false);

    if (!href.startsWith('#')) {
      navigate(href);
      return;
    }

    // Section links: scroll when already home, otherwise route home with the hash.
    if (location.pathname === '/') {
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
      window.history.replaceState(null, '', href);
    } else {
      navigate(`/${href}`);
    }
  };

  const initial = (user?.displayName || user?.email || '?').charAt(0).toUpperCase();

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled || isMobileMenuOpen
          ? 'bg-background/95 backdrop-blur-md shadow-golden border-b border-primary/10'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              handleNavClick('#home');
            }}
            className="flex items-center gap-3 group shrink-0"
          >
            <img
              src="/logoj.png"
              alt="BrightMinds"
              className="h-14 sm:h-16 md:h-20 w-auto group-hover:scale-105 transition-transform duration-300"
            />
          </a>

          {/* Desktop navigation */}
          <div className="hidden lg:flex items-center gap-0.5">
            {mainLinks.map((link) => (
              <button
                key={link.name}
                onClick={() => handleNavClick(link.href)}
                className="px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground relative group transition-colors duration-300"
              >
                {link.name}
                <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full group-hover:left-0" />
              </button>
            ))}
          </div>

          {/* Desktop actions */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-2 rounded-full border border-primary/20 bg-background/80 py-1 pl-1 pr-3 hover:border-primary transition-colors duration-300"
                    aria-label="Account menu"
                  >
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <span className="w-8 h-8 rounded-full bg-gradient-accent flex items-center justify-center text-sm font-bold text-foreground">
                        {initial}
                      </span>
                    )}
                    <span className="text-sm font-medium text-foreground max-w-[7rem] truncate">
                      {user.displayName?.split(' ')[0] || 'Account'}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
                    {user.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    My dashboard
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      Admin
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" size="default" onClick={() => navigate('/login')}>
                <UserIcon className="w-4 h-4" />
                Login
              </Button>
            )}

            <Button variant="hero" size="default" onClick={() => handleNavClick('#courses')}>
              Enrol Now
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className="lg:hidden p-2 rounded-lg hover:bg-secondary transition-colors duration-300"
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-foreground" />
            ) : (
              <Menu className="w-6 h-6 text-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`lg:hidden transition-all duration-300 overflow-hidden ${
          isMobileMenuOpen ? 'max-h-[calc(100vh-5rem)] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-background/98 backdrop-blur-lg border-t border-primary/10 px-4 py-5 space-y-1 overflow-y-auto max-h-[calc(100vh-5rem)]">
          {user && (
            <div className="flex items-center gap-3 px-4 py-3 mb-2 rounded-2xl bg-secondary/60">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover shrink-0"
                />
              ) : (
                <span className="w-10 h-10 rounded-full bg-gradient-accent flex items-center justify-center font-bold text-foreground shrink-0">
                  {initial}
                </span>
              )}
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">
                  {user.displayName || 'Student'}
                </div>
                <div className="text-xs text-muted-foreground truncate">{user.email}</div>
              </div>
            </div>
          )}

          {mainLinks.map((link) => (
            <button
              key={link.name}
              onClick={() => handleNavClick(link.href)}
              className="block w-full text-left px-4 py-3 text-foreground/80 hover:text-foreground hover:bg-secondary rounded-lg transition-all duration-300 font-medium"
            >
              {link.name}
            </button>
          ))}

          <div className="pt-2 mt-2 border-t border-primary/10 space-y-1">
            {user ? (
              <>
                <button
                  onClick={() => handleNavClick('/dashboard')}
                  className="block w-full text-left px-4 py-3 text-foreground/80 hover:text-foreground hover:bg-secondary rounded-lg transition-all duration-300 font-medium"
                >
                  My dashboard
                </button>
                {isAdmin && (
                  <button
                    onClick={() => handleNavClick('/admin')}
                    className="block w-full text-left px-4 py-3 text-foreground/80 hover:text-foreground hover:bg-secondary rounded-lg transition-all duration-300 font-medium"
                  >
                    Admin
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={() => handleNavClick('/login')}
                className="block w-full text-left px-4 py-3 text-foreground/80 hover:text-foreground hover:bg-secondary rounded-lg transition-all duration-300 font-medium"
              >
                Student login
              </button>
            )}

            {secondaryLinks.map((link) => (
              <button
                key={link.name}
                onClick={() => handleNavClick(link.href)}
                className="block w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all duration-300"
              >
                {link.name}
              </button>
            ))}
          </div>

          <div className="pt-4 space-y-2">
            <Button
              variant="hero"
              size="lg"
              className="w-full"
              onClick={() => handleNavClick('#courses')}
            >
              Enrol Now
            </Button>
            {user && (
              <Button
                variant="heroOutline"
                size="lg"
                className="w-full"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  void signOut();
                }}
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
