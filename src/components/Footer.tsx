import { Mail, MapPin } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const navigate = useNavigate();
  const location = useLocation();

  const goToSection = (href: string) => {
    if (location.pathname === '/') {
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate(`/${href}`);
    }
  };

  const quickLinks = [
    { name: 'Home', href: '#home' },
    { name: 'About Us', href: '#about' },
    { name: 'Courses', href: '#courses' },
    { name: 'Programs', href: '#programs' },
    { name: 'Why Us', href: '#why-us' },
    { name: 'Contact', href: '#contact' },
  ];

  const accountLinks = [
    { name: 'Student Login', href: '/login' },
    { name: 'My Dashboard', href: '/dashboard' },
  ];

  const legalLinks = [
    { name: 'Privacy Policy', href: '/privacy-policy' },
    { name: 'Terms of Use', href: '/terms-of-use' },
    { name: 'Delete Account', href: '/delete-account' },
  ];

  return (
    <footer className="bg-foreground text-background py-14 sm:py-16 relative overflow-hidden">
      {/* Decorative Element */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12 mb-12">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="mb-6 bg-background/10 p-4 rounded-2xl inline-block">
              <img src="/logoji.png" alt="BrightMinds" className="h-16 sm:h-20 w-auto" />
            </div>
            <p className="text-background/70 leading-relaxed">
              BrightMinds guides students early so they are not only academically strong,
              but also confident and capable of making informed career choices.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-semibold text-lg text-background mb-6">Quick Links</h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <button
                    onClick={() => goToSection(link.href)}
                    className="text-background/70 hover:text-primary transition-colors duration-300"
                  >
                    {link.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Account & legal */}
          <div>
            <h4 className="font-display font-semibold text-lg text-background mb-6">Students</h4>
            <ul className="space-y-3 mb-8">
              {accountLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-background/70 hover:text-primary transition-colors duration-300"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>

            <h4 className="font-display font-semibold text-lg text-background mb-6">Legal</h4>
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-background/70 hover:text-primary transition-colors duration-300"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-display font-semibold text-lg text-background mb-6">Contact Us</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-background/70">
                  1st floor, Shivshambho Towers, Tapovan Road, Behind Saibaba Mandir, Nirmalnagar, Ahilyanagar
                  <br />
                  414003, Maharashtra, India
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-background/70">hello@brightminds.in</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-background/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-background/50 text-sm text-center md:text-left">
            © {currentYear} BrightMinds. All rights reserved.
          </p>
          <div className="flex items-center gap-4 sm:gap-6 text-sm text-background/50">
            <span>Classes 7-10</span>
            <span className="w-1 h-1 rounded-full bg-primary" />
            <span>Ahilyanagar</span>
            <span className="w-1 h-1 rounded-full bg-primary" />
            <span>India</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
