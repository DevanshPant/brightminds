import { useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Clock,
  Monitor,
  Users,
  CalendarDays,
  ShieldCheck,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import EnrollButton from '@/components/EnrollButton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { formatINR, getCourse } from '@/config/course';

const CoursePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const course = slug ? getCourse(slug) : undefined;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  if (!course) return <Navigate to="/404" replace />;

  const meta = [
    { icon: Clock, label: 'Duration', value: course.duration },
    { icon: Monitor, label: 'Format', value: course.mode },
    { icon: Users, label: 'Who it is for', value: course.eligibility },
    { icon: CalendarDays, label: 'Batch Starts', value: course.startsOn || 'Announced soon' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <header className="pt-28 sm:pt-32 lg:pt-36 pb-12 sm:pb-16 bg-gradient-hero relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <Link
            to="/#courses"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            All courses
          </Link>

          <div className="grid lg:grid-cols-[1fr_380px] gap-10 lg:gap-14 items-start">
            {/* Left - headline */}
            <div>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-accent text-xs font-bold text-foreground uppercase tracking-wide mb-5">
                <Sparkles className="w-3.5 h-3.5" />
                {course.tagline}
              </span>
              <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] mb-5">
                {course.heading}
              </h1>
              <p className="text-lg sm:text-xl font-semibold text-primary mb-4">
                {course.title} · {course.subtitle}
              </p>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl">
                {course.description}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 max-w-2xl">
                {meta.map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="flex items-start gap-3 rounded-2xl border border-primary/10 bg-card px-4 py-3.5"
                  >
                    <Icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
                      <div className="text-sm font-semibold text-foreground leading-snug">{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right - sticky pricing card */}
            <aside className="lg:sticky lg:top-28 w-full">
              <div className="rounded-3xl border border-primary/15 bg-card p-6 sm:p-7 shadow-golden-lg">
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="font-display text-4xl sm:text-5xl font-bold text-foreground">
                    {formatINR(course.price)}
                  </span>
                  {course.originalPrice && (
                    <span className="text-lg text-muted-foreground line-through">
                      {formatINR(course.originalPrice)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                  One-time payment for the complete programme. No hidden charges.
                </p>

                <EnrollButton course={course} className="w-full" size="lg" />

                <ul className="mt-6 space-y-3">
                  {[
                    { icon: ShieldCheck, text: 'Secure payment via Razorpay - UPI, cards, net banking' },
                    { icon: Check, text: 'Instant payment receipt emailed to you' },
                    { icon: MessageCircle, text: 'Private WhatsApp community link on enrolment' },
                  ].map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <Icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{text}</span>
                    </li>
                  ))}
                </ul>

                {course.seats && (
                  <p className="mt-5 pt-5 border-t border-primary/10 text-xs font-medium text-foreground/70 text-center">
                    {course.seats}
                  </p>
                )}
              </div>
            </aside>
          </div>
        </div>
      </header>

      {/* What you get */}
      <section className="py-16 sm:py-20 lg:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3">
            What is included
          </h2>
          <p className="text-muted-foreground mb-10 max-w-2xl">
            Everything in the programme, at a glance.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {course.highlights.map((highlight) => (
              <div
                key={highlight.title}
                className="group rounded-3xl border border-primary/10 bg-gradient-golden p-6 hover:shadow-golden-lg transition-all duration-500 hover:-translate-y-1"
              >
                <div className="w-11 h-11 rounded-2xl bg-gradient-accent flex items-center justify-center shadow-golden mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Check className="w-5 h-5 text-foreground" />
                </div>
                <h3 className="font-display text-lg font-bold text-foreground mb-2">{highlight.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{highlight.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Outcomes */}
      <section className="py-16 sm:py-20 lg:py-24 bg-gradient-golden">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-8 text-center">
            What you walk away with
          </h2>
          <ul className="space-y-4">
            {course.outcomes.map((outcome) => (
              <li
                key={outcome}
                className="flex items-start gap-3 rounded-2xl bg-background border border-primary/10 px-5 py-4"
              >
                <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span className="text-foreground/85 leading-relaxed">{outcome}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-20 lg:py-24 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-8 text-center">
            Frequently asked questions
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {course.faqs.map((faq, index) => (
              <AccordionItem key={faq.q} value={`faq-${index}`} className="border-primary/10">
                <AccordionTrigger className="text-left font-display text-base sm:text-lg font-semibold hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="pb-20 sm:pb-24 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-accent p-8 sm:p-12 text-center shadow-golden-lg">
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Ready to begin your NDA journey?
            </h2>
            <p className="text-foreground/80 mb-8 max-w-xl mx-auto leading-relaxed">
              {course.seats ? `${course.seats}. ` : ''}Enrol in under two minutes - sign in with Google,
              pay {formatINR(course.price)} securely, and join the community straight away.
            </p>
            <div className="flex justify-center">
              <EnrollButton
                course={course}
                variant="heroOutline"
                className="w-full sm:w-auto bg-background"
              />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CoursePage;
