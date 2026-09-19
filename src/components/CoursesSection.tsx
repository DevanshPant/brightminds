import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Users, Monitor, Sparkles, Check } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { Button } from '@/components/ui/button';
import EnrollButton from '@/components/EnrollButton';
import { COURSES, formatINR } from '@/config/course';

const CoursesSection = () => {
  const { ref: sectionRef, isVisible } = useScrollAnimation<HTMLElement>();
  const courses = COURSES.filter((course) => course.active);

  if (courses.length === 0) return null;

  return (
    <section
      id="courses"
      ref={sectionRef}
      className="py-20 sm:py-24 lg:py-32 bg-gradient-golden relative overflow-hidden"
    >
      {/* Decorative glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-accent/10 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div
          className={`text-center max-w-3xl mx-auto mb-12 sm:mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/15 text-sm font-medium text-foreground mb-4">
            <Sparkles className="w-4 h-4" />
            Courses
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-5 sm:mb-6 uppercase">
            Enrol Online in Minutes
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Structured, mentor-led programmes you can join from anywhere. Pay securely, get an
            instant receipt, and step straight into our private student community.
          </p>
        </div>

        {/* Course cards */}
        <div
          className={`grid grid-cols-1 ${
            courses.length > 1 ? 'lg:grid-cols-2' : 'max-w-4xl mx-auto'
          } gap-6 sm:gap-8`}
        >
          {courses.map((course, index) => (
            <article
              key={course.id}
              className={`group relative flex flex-col bg-background border border-primary/15 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-golden hover:shadow-golden-lg transition-all duration-500 hover:-translate-y-1 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: `${index * 120}ms` }}
            >
              {/* Tagline pill */}
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-accent text-xs font-bold text-foreground uppercase tracking-wide">
                  {course.tagline}
                </span>
                {course.seats && (
                  <span className="text-xs font-medium text-muted-foreground">{course.seats}</span>
                )}
              </div>

              {/* Main heading */}
              <h3 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight mb-3">
                {course.heading}
              </h3>
              <p className="text-sm sm:text-base font-semibold text-primary mb-4">
                {course.title} · {course.subtitle}
              </p>
              <p className="text-muted-foreground leading-relaxed mb-6">{course.description}</p>

              {/* Meta strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                {[
                  { icon: Clock, label: course.duration },
                  { icon: Monitor, label: course.mode },
                  { icon: Users, label: course.eligibility },
                ].map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2.5 rounded-2xl bg-secondary/60 px-3.5 py-3 text-sm text-foreground/80"
                  >
                    <Icon className="w-4 h-4 text-primary shrink-0" />
                    <span className="leading-snug">{label}</span>
                  </div>
                ))}
              </div>

              {/* Top highlights */}
              <ul className="space-y-2.5 mb-8">
                {course.highlights.slice(0, 4).map((highlight) => (
                  <li key={highlight.title} className="flex items-start gap-2.5 text-sm text-foreground/80">
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>
                      <strong className="font-semibold text-foreground">{highlight.title}</strong>
                      {' - '}
                      {highlight.description}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Price + actions */}
              <div className="mt-auto pt-6 border-t border-primary/10">
                <div className="flex items-baseline gap-3 mb-5">
                  <span className="font-display text-4xl sm:text-5xl font-bold text-foreground">
                    {formatINR(course.price)}
                  </span>
                  {course.originalPrice && (
                    <>
                      <span className="text-lg text-muted-foreground line-through">
                        {formatINR(course.originalPrice)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                        {Math.round((1 - course.price / course.originalPrice) * 100)}% off
                      </span>
                    </>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-5">
                  One-time payment · Instant receipt by email
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <EnrollButton course={course} className="w-full sm:flex-1" />
                  <Button variant="heroOutline" size="lg" className="w-full sm:w-auto" asChild>
                    <Link to={`/courses/${course.slug}`}>
                      Course details
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CoursesSection;
