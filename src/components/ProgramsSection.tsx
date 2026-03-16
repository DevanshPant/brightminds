import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { BookMarked, Shield, Rocket, Brain } from 'lucide-react';

const ProgramsSection = () => {
  const { ref: sectionRef, isVisible } = useScrollAnimation<HTMLElement>();

  const programs = [
    {
      icon: BookMarked,
      title: 'Foundation Coaching',
      subtitle: 'Classes 7-10',
      description: 'Comprehensive coverage of NCERT curriculum with focus on conceptual clarity and problem-solving skills for all subjects.',
      features: ['Mathematics', 'Science', 'Social Studies', 'Regular Assessments'],
      color: 'primary',
    },
    {
      icon: Brain,
      title: 'Career Guidance',
      subtitle: 'Exposure Sessions',
      description: 'Early exposure to career options and various professional paths to help students make informed choices.',
      features: ['Career clarity', 'Expert interactions', 'Professional Direction', 'Personality Development'],
      color: 'accent',
    },
    {
      icon: Shield,
      title: 'Defense Orientation',
      subtitle: 'NDA & TES Awareness',
      description: 'Introduction to defense career paths with focus on preparing students mentally and physically for future entrance exams.',
      features: ['Entrance Coaching', 'Officer interaction', 'Service insights', 'Veteran Guidance'],
      color: 'primary',
    },
  ];

  return (
    <section
      id="programs"
      ref={sectionRef}
      className="py-24 lg:py-32 bg-background relative overflow-hidden"
    >
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div
          className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-sm font-medium text-foreground mb-4">
            Our Programs
          </span>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-foreground mb-6 uppercase">
            WHAT WE OFFER
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            We offer a unique blend of academic excellence and life skills development, 
            preparing students for success in every aspect of life.
          </p>
        </div>

        {/* Programs Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {programs.map((program, index) => (
            <div
              key={program.title}
              className={`group relative bg-gradient-golden border border-primary/10 rounded-3xl p-8 hover:shadow-golden-lg transition-all duration-500 hover:-translate-y-1 ${
                isVisible
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl ${program.color === 'primary' ? 'bg-gradient-accent' : 'bg-accent'} flex items-center justify-center shadow-golden group-hover:scale-110 transition-transform duration-300`}>
                    <program.icon className="w-7 h-7 text-foreground" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold text-foreground">
                      {program.title}
                    </h3>
                    <span className="text-sm text-primary font-medium">{program.subtitle}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-muted-foreground mb-6 leading-relaxed">
                {program.description}
              </p>

              {/* Features */}
              <div className="grid grid-cols-2 gap-3">
                {program.features.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-2 text-sm text-foreground/80"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {feature}
                  </div>
                ))}
              </div>

              {/* Hover Gradient */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProgramsSection;
