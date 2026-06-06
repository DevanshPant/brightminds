import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { Lightbulb, Heart, Compass, BookOpen } from 'lucide-react';

const AboutSection = () => {
  const { ref: sectionRef, isVisible } = useScrollAnimation<HTMLElement>();

  const values = [
    {
      icon: Lightbulb,
      title: 'Clarity of Purpose',
      description: 'Helping students understand their strengths and aspirations early in their academic journey.',
    },
    {
      icon: Heart,
      title: 'Value-Based Education',
      description: 'Instilling discipline, respect, and leadership qualities alongside academic excellence.',
    },
    {
      icon: Compass,
      title: 'Career Guidance',
      description: 'Exposing students to various career paths including defense services, engineering, and more.',
    },
    {
      icon: BookOpen,
      title: 'Strong Foundations',
      description: 'Building conceptual understanding that prepares students for competitive examinations.',
    },
  ];

  return (
    <section
      id="about"
      ref={sectionRef}
      className="py-24 lg:py-32 bg-gradient-golden relative overflow-hidden"
    >
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-sm font-medium text-foreground mb-4">
            About Us
          </span>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-foreground mb-6">
            About <span className="text-gradient-gold">BrightMinds</span>
          </h2>
          <div className="text-lg text-muted-foreground leading-relaxed space-y-4">
            <p>
              BrightMinds was founded with a clear vision: to guide students early so they are not only academically strong, but also confident and capable of making informed career choices.
            </p>
            <p>
              Along with comprehensive academic coaching, we expose students to the real world through regular interactions with professionals from fields such as Defence Services, Finance, Engineering, Medicine, Architecture, Psychology, and more.
            </p>
            <p>
              Our approach combines rigorous academic training with mentorship, discipline, and values, preparing students not just for exams, but for life.
            </p>
          </div>
        </div>

        {/* Values Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {values.map((value, index) => (
            <div
              key={value.title}
              className={`group bg-background/80 backdrop-blur-sm border border-primary/10 rounded-2xl p-8 hover:shadow-golden-lg hover:border-primary/30 transition-all duration-500 ${
                isVisible
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-accent flex items-center justify-center shadow-golden group-hover:scale-110 transition-transform duration-300">
                    <value.icon className="w-8 h-8 text-foreground" />
                  </div>
                </div>
                <div>
                  <h3 className="font-display text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors duration-300">
                    {value.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {value.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Quote */}
        <div
          className={`mt-16 text-center transition-all duration-700 delay-500 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="inline-flex items-center gap-4 px-8 py-4 rounded-2xl bg-background/60 border border-primary/20 shadow-golden">
            <div className="w-1 h-12 bg-gradient-accent rounded-full" />
            <p className="text-lg font-medium text-foreground italic">
              "The foundation you build today determines the heights you reach tomorrow."
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
